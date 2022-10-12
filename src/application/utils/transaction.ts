import type {
  ChangeAddressFromAssetGetter,
  CoinSelector,
  RecipientInterface,
  TxInterface,
  UnblindedOutput,
  CoinSelectorErrorFn,
  NetworkString,
  IdentityInterface,
  confidential,
  OwnedInput,
  networks
} from 'ldk';
import {
  Creator,
  Pset,
  Finalizer,
  Extractor,
  address,
  createFeeOutput,
  decodePset,
  getUnblindURLFromTx,
  greedyCoinSelector,
  psetToUnsignedTx,
  isUnblindedOutput,
  getSats,
  getAsset,
  isConfidentialOutput,
  payments,
  Psbt,
  Updater,
  CreatorInput,
  Transaction,
} from 'ldk';
import { isConfidentialAddress } from './address';
import type { Transfer, TxDisplayInterface } from '../../domain/transaction';
import { TxStatusEnum, TxType } from '../../domain/transaction';
import { lbtcAssetByNetwork } from './network';
import type { TopupWithAssetReply } from './taxi';
import { fetchTopupFromTaxi, taxiURL } from './taxi';
import type { DataRecipient, Recipient } from 'marina-provider';
import { isAddressRecipient, isDataRecipient } from 'marina-provider';
import * as ecc from 'tiny-secp256k1';

const blindingKeyFromAddress = (addr: string): Buffer => {
  return address.fromConfidential(addr).blindingKey;
};

function outPubKeysMap(pset: string, outputAddresses: string[]): Map<number, Buffer> {
  const outPubkeys: Map<number, Buffer> = new Map();

  for (const outAddress of outputAddresses) {
    const index = outputIndexFromAddress(pset, outAddress);
    if (index === -1) continue;
    if (isConfidentialAddress(outAddress)) {
      outPubkeys.set(index, blindingKeyFromAddress(outAddress));
    }
  }

  return outPubkeys;
}

/**
 * Computes the blinding data map used to blind the pset.
 * @param pset the unblinded pset to compute the blinding data map
 * @param utxos utxos to use in order to get the blinding data of confidential inputs (not needed for unconfidential ones).
 */
function inputBlindingDataMap(
  pset: string,
  utxos: UnblindedOutput[]
): Map<number, confidential.UnblindOutputResult> {
  const inputBlindingData = new Map<number, confidential.UnblindOutputResult>();
  const txidToBuffer = function (txid: string) {
    return Buffer.from(txid, 'hex').reverse();
  };

  let index = -1;
  for (const input of psetToUnsignedTx(pset).ins) {
    index++;
    const utxo = utxos.find(
      (u) => txidToBuffer(u.txid).equals(input.hash) && u.vout === input.index
    );

    // only add unblind data if the prevout of the input is confidential
    if (utxo && utxo.unblindData && isConfidentialOutput(utxo.prevout)) {
      inputBlindingData.set(index, utxo.unblindData);
    }
  }

  return inputBlindingData;
}

async function blindPset(psetBase64: string, utxos: UnblindedOutput[], outputAddresses: string[]) {
  const outputPubKeys = outPubKeysMap(psetBase64, outputAddresses);
  const inputBlindingData = inputBlindingDataMap(psetBase64, utxos);

  return (
    await decodePset(psetBase64).blindOutputsByIndex(
      Psbt.ECCKeysGenerator(ecc),
      inputBlindingData,
      outputPubKeys
    )
  ).toBase64();
}

function isFullyBlinded(psetBase64: string, excludeAddresses: string[]) {
  const excludeScripts = excludeAddresses.map((a) => address.toOutputScript(a));
  const tx = psetToUnsignedTx(psetBase64);
  for (const out of tx.outs) {
    if (out.script.length > 0 && !excludeScripts.includes(out.script)) {
      if (!out.rangeProof || !out.surjectionProof) {
        return false;
      }
    }
  }

  return true;
}

const functionOR =
  (...fns: any[]) =>
  (errorMsg: string) =>
  (...args: any[]) => {
    for (const fn of fns) {
      try {
        return fn(...args);
      } catch (e) {
        // do nothing
      }
    }

    throw new Error(errorMsg);
  };

const bothSigValidator = functionOR(
  Psbt.ECDSASigValidator(ecc),
  Psbt.SchnorrSigValidator(ecc)
)('invalid signature');

/**
 * Take an unsigned pset, blind it according to recipientAddresses and sign the pset using the mnemonic.
 * @param signerIdentity Identity using to sign the tx. should be restored.
 * @param psetBase64 the unsign tx.
 * @param recipientAddresses a list of known recipients addresses (non wallet output addresses).
 */
export async function blindAndSignPsetV0(
  psetBase64: string,
  selectedUtxos: UnblindedOutput[],
  identities: IdentityInterface[],
  recipientAddresses: string[],
  changeAddresses: string[],
  skipSigValidation = false
): Promise<string> {
  const outputAddresses = recipientAddresses.concat(changeAddresses);

  const blindedPset = await blindPset(psetBase64, selectedUtxos, outputAddresses);
  if (!isFullyBlinded(blindedPset, recipientAddresses)) {
    throw new Error('blindPSET error: not fully blinded');
  }

  const signedPsetBase64 = await signPsetV0(blindedPset, identities);

  const pset = Psbt.fromBase64(signedPsetBase64);
  if (!skipSigValidation) {
    if (!pset.validateSignaturesOfAllInputs(bothSigValidator)) {
      throw new Error('PSET is not fully signed');
    }
  }

  for (let i = 0; i < pset.txInputs.length; i++) {
    // const input = pset.data.inputs[i];
    // we need to use special finalizer in case of tapscript
    // if (atLeastOne(input.tapLeafScript) && atLeastOne(input.tapScriptSig)) {
    //   pset.finalizeInput(i, (_, input) => {
    //     return {
    //       finalScriptSig: undefined,
    //       finalScriptWitness: witnessStackToScriptWitness([
    //         ...input.tapScriptSig!.map((s) => s.signature),
    //         input.tapLeafScript![0].script,
    //         input.tapLeafScript![0].controlBlock,
    //       ]),
    //     };
    //   });
    // } else {
    pset.finalizeInput(i); // default finalizer handles taproot key path and non taproot sigs
    // }
  }

  return pset.extractTransaction().toHex();
}
// const atLeastOne = (arr: any[] | undefined) => arr && arr.length > 0;

export async function blindAndSignPsetV2(
  psetBase64: string,
  identities: IdentityInterface[],
  selectedUtxos: OwnedInput[]
): Promise<string> {
  let psetStr = psetBase64;

  for (let i = 0; i < identities.length; i++) {
    const id = identities[i];
    psetStr = await id.blindPsetV2(psetStr, i === identities.length - 1, selectedUtxos);
  }
  
  psetStr = await signPsetV2(psetStr, identities);
  const pset = Pset.fromBase64(psetStr);
  new Finalizer(pset).finalize();

  return Extractor.extract(pset).toHex();
}

export async function signPsetV2(
  psetBase64: string,
  identities: IdentityInterface[]
): Promise<string> {
  let psetStr = psetBase64;
  for (const id of identities) {
    psetStr = await id.signPsetV2(psetStr);
    try {
      if (Pset.fromBase64(psetStr).validateAllSignatures(bothSigValidator)) return psetStr;
    } catch {
      continue
    }
  }
  return psetStr;
}

export async function signPsetV0(
  psetBase64: string,
  identities: IdentityInterface[]
): Promise<string> {
  let pset = psetBase64;
  for (const id of identities) {
    pset = await id.signPset(pset);
    try {
      if (decodePset(pset).validateSignaturesOfAllInputs(bothSigValidator)) break;
    } catch {
      continue;
    }
  }

  return pset;
}

function outputIndexFromAddress(tx: string, addressToFind: string): number {
  const utx = psetToUnsignedTx(tx);
  const recipientScript = address.toOutputScript(addressToFind);
  return utx.outs.findIndex((out) => out.script.equals(recipientScript));
}

const throwErrorCoinSelector: CoinSelectorErrorFn = (
  asset: string,
  amount: number,
  has: number
) => {
  throw new Error(`Not enought coins to select ${amount} ${asset} (has: ${has})`);
};

/**
 * Create tx from a Topup object.
 * @param taxiReply the topup describing the taxi response.
 * @param unspents a list of utxos used to fund the tx.
 * @param recipients a list of output to send.
 * @param coinSelector the way used to coin select the unspents.
 * @param changeAddressGetter define the way we get change addresses (if needed).
 */
export function createTaxiTxFromTopup(
  taxiReply: TopupWithAssetReply,
  unspents: UnblindedOutput[],
  recipients: RecipientInterface[],
  coinSelector: CoinSelector,
  changeAddressGetter: ChangeAddressFromAssetGetter
): { pset: string; selectedUtxos: UnblindedOutput[] } {
  const { selectedUtxos, changeOutputs } = coinSelector(throwErrorCoinSelector)(
    unspents,
    recipients.concat({
      value: taxiReply.assetAmount,
      asset: taxiReply.assetHash,
      address: '', // address is not useful for coinSelector
    }),
    changeAddressGetter
  );

  const pset = Pset.fromBase64(taxiReply.topup.partial);
  const initialNumberOfInputs = pset.globals.inputCount;
  const updater = new Updater(pset);
  updater.addInputs(selectedUtxos.map((u) => new CreatorInput(u.txid, u.vout)));
  for (let i = 0; i < selectedUtxos.length; i++) {
    updater.addInWitnessUtxo(i + initialNumberOfInputs, selectedUtxos[i].prevout);
    updater.addInSighashType(i + initialNumberOfInputs, Transaction.SIGHASH_ALL);
  } 
  updater.addOutputs(recipients.concat(changeOutputs).map((r) => ({ 
    amount: r.value, 
    asset: r.asset, 
    script: address.toOutputScript(r.address), 
    blindingPublicKey: isConfidentialAddress(r.address) ? address.fromConfidential(r.address).blindingKey : undefined,
    blinderIndex: isConfidentialAddress(r.address) ? 1 : undefined,
  })));

  return { pset: updater.pset.toBase64(), selectedUtxos };
}

/**
 * Create an unsigned tx from utxos set and list of recipients.
 * @param recipients will create the outputs.
 * @param unspents will be selected for the inputs.
 * @param feeAssetHash if !== L-BTC: we'll request taxi to pay the fees.
 * @param changeAddressGetter the way we fetch change addresses.
 */
export async function createSendPset(
  recipients: RecipientInterface[],
  unspents: UnblindedOutput[],
  feeAssetHash: string,
  changeAddressGetter: ChangeAddressFromAssetGetter,
  network: NetworkString,
  data?: DataRecipient[],
  coinSelector: CoinSelector = greedyCoinSelector()
): Promise<{
  pset: string;
  selectedUtxos: UnblindedOutput[];
}> {
  if (feeAssetHash === lbtcAssetByNetwork(network)) {
    const targetRecipients = recipients.concat(
      data ? data.map((d) => ({ ...d, address: '' })) : []
    );

    const { selectedUtxos, changeOutputs } = coinSelector(throwErrorCoinSelector)(
      unspents,
      targetRecipients,
      changeAddressGetter
    );

    // compute the amount according to tx size
    const feeOutput = createFeeOutput(
      selectedUtxos.length,
      changeOutputs.length + recipients.filter(r => isConfidentialAddress(r.address)).length + (data ? data.length : 0) + 1,
      recipients.filter(r => !isConfidentialAddress(r.address)).length,
      [...recipients.map(r => address.toOutputScript(r.address).length), ...changeOutputs.map(c => address.toOutputScript(c.address).length)],
      0.1,
      feeAssetHash
    );

    const selection = coinSelector(throwErrorCoinSelector)(
      unspents,
      targetRecipients.concat([feeOutput]),
      changeAddressGetter
    );

    const pset = Creator.newPset();
    const updater = new Updater(pset);
    updater
      .addInputs(selection.selectedUtxos.map(u => ({ txid: u.txid, txIndex: u.vout, witnessUtxo: u.prevout, sighashType: Transaction.SIGHASH_ALL })))
      .addOutputs(
        [...recipients, ...selection.changeOutputs].map(r => ({ 
          amount: r.value, 
          asset: r.asset, 
          script: address.toOutputScript(r.address), 
          blindingPublicKey: isConfidentialAddress(r.address) ? address.fromConfidential(r.address).blindingKey : undefined,
          blinderIndex: isConfidentialAddress(r.address) ? 0 : undefined,
        })))
      .addOutputs([{ amount: feeOutput.value, asset: feeOutput.asset }]);

    // add OP_RETURN outputs if needed
    if (data && data.length > 0) {
      updater.addOutputs(data.map(d => ({ amount: d.value, asset: d.asset, script: payments.embed({ data: [Buffer.from(d.data, 'hex')] }).output! })));
    }

    return { pset: updater.pset.toBase64(), selectedUtxos: selection.selectedUtxos };
  }

  const reply = await fetchTopupFromTaxi(taxiURL[network], feeAssetHash);
  if (!reply) throw new Error('something went wrong with taxi');

  const res = createTaxiTxFromTopup(
    reply,
    unspents,
    recipients,
    greedyCoinSelector(),
    changeAddressGetter
  );
  return res;
}

export function isPsetV0(pset: string) {
    try {
      Psbt.fromBase64(pset);
      return true;
    } catch (e) {
      return false;
    }
}

export function isPsetV2(pset: string) {
    try {
      Pset.fromBase64(pset);
      return true;
    } catch (e) {
      return false;
    }
}

/**
 * Convert a TxInterface to DisplayInterface
 * @param tx txInterface
 * @param walletScripts the wallet's scripts i.e wallet scripts from wallet's addresses.
 */
export function toDisplayTransaction(
  tx: TxInterface,
  walletScripts: string[],
  network: networks.Network
): TxDisplayInterface {
  const transfers = getTransfers(tx.vin, tx.vout, walletScripts, network);
  return {
    txId: tx.txid,
    blockTimeMs: tx.status.blockTime ? tx.status.blockTime * 1000 : undefined,
    status: tx.status.confirmed ? TxStatusEnum.Confirmed : TxStatusEnum.Pending,
    fee: tx.fee,
    transfers,
    type: txTypeFromTransfer(transfers),
    webExplorersBlinders: getUnblindURLFromTx(tx, ''),
  };
}

export function txTypeAsString(txType: TxType = TxType.Unknow): string {
  switch (txType) {
    case TxType.SelfTransfer:
      return 'Self Transfer';
    case TxType.Deposit:
      return 'Received';
    case TxType.Withdraw:
      return 'Sent';
    case TxType.Swap:
      return 'Swap';
    case TxType.Unknow:
      return 'Transaction';
  }
}

function txTypeFromTransfer(transfers: Transfer[]): TxType {
  if (transfers.some(({ amount }) => amount === 0)) {
    return TxType.SelfTransfer;
  }

  if (transfers.length === 1) {
    if (transfers[0].amount > 0) {
      return TxType.Deposit;
    }

    if (transfers[0].amount < 0) {
      return TxType.Withdraw;
    }
  }

  if (transfers.length === 2) {
    return TxType.Swap;
  }

  return TxType.Unknow;
}

/**
 * Take two vectors: vin and vout representing a transaction
 * then, using the whole list of a wallet's script, we return a set of Transfers
 * @param vin
 * @param vout
 * @param walletScripts
 */
function getTransfers(
  vin: TxInterface['vin'],
  vout: TxInterface['vout'],
  walletScripts: string[],
  network: networks.Network
): Transfer[] {
  const transfers: Transfer[] = [];

  const addToTransfers = (amount: number, asset: string) => {
    const transferIndex = transfers.findIndex((t) => t.asset === asset);

    if (transferIndex >= 0) {
      transfers[transferIndex].amount += amount;
      return;
    }

    transfers.push({
      amount,
      asset,
    });
  };

  for (const input of vin) {
    if (!input.prevout) throw new Error('malformed tx interface (missing prevout)');

    if (!walletScripts.includes(input.prevout.prevout.script.toString('hex'))) continue;
    if (isConfidentialOutput(input.prevout.prevout) && !isUnblindedOutput(input.prevout)) {
      throw new Error(
        `prevout ${input.prevout.txid}:${input.prevout.vout} is not unblinded but is a confidential output, amount displayed may be wrong`
      );
    }
    addToTransfers(-1 * getSats(input.prevout), getAsset(input.prevout));
  }

  let feeAmount = 0;
  let feeAsset = network.assetHash;

  for (const output of vout) {
    if (output.prevout.script.length === 0) {
      // handle the fee output
      feeAmount = getSats(output);
      feeAsset = getAsset(output);
      continue;
    }

    if (!walletScripts.includes(output.prevout.script.toString('hex'))) continue;
    if (isConfidentialOutput(output.prevout) && !isUnblindedOutput(output))
      throw new Error(
        `prevout ${output.txid}:${output.vout} is not unblinded but is a confidential output`
      );
    addToTransfers(getSats(output), getAsset(output));
  }

  return transfers.filter((t, index, rest) => {
    if (t.asset === feeAsset && Math.abs(t.amount) === feeAmount) {
      if (rest.length === 1) {
        transfers[index].amount = 0;
        return true;
      }
      return false;
    }

    return true;
  });
}

/**
 * Used to sort marina-provider Recipient type
 * @param recipients
 */
export function sortRecipients(recipients: Recipient[]): {
  data: DataRecipient[];
  addressRecipients: RecipientInterface[];
} {
  const addressRecipients: RecipientInterface[] = [];
  const data: DataRecipient[] = [];

  for (const recipient of recipients) {
    if (isDataRecipient(recipient)) {
      data.push(recipient);
    } else if (isAddressRecipient(recipient)) {
      addressRecipients.push(recipient);
    }
  }

  return { data, addressRecipients };
}
