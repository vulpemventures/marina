import {
  address,
  address as addrLDK,
  addToTx,
  BlindedOutputInterface,
  ChangeAddressFromAssetGetter,
  CoinSelector,
  createFeeOutput,
  decodePset,
  getUnblindURLFromTx,
  greedyCoinSelector,
  IdentityInterface,
  InputInterface,
  isBlindedOutputInterface,
  psetToUnsignedTx,
  RecipientInterface,
  TxInterface,
  UnblindedOutputInterface,
  UtxoInterface,
} from 'ldk';
import { confidential, networks, payments, Psbt } from 'liquidjs-lib';
import { isConfidentialAddress, networkFromString } from './address';
import { Transfer, TxDisplayInterface, TxStatusEnum, TxType } from '../../domain/transaction';
import { Topup } from 'taxi-protobuf/generated/js/taxi_pb';
import { lbtcAssetByNetwork } from './network';
import { Network } from '../../domain/network';
import { fetchTopupFromTaxi } from './taxi';
import { taxiURL } from './constants';
import { DataRecipient, isAddressRecipient, isDataRecipient, Recipient } from 'marina-provider';

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

function inputBlindingDataMap(
  pset: string,
  utxos: UtxoInterface[]
): Map<number, confidential.UnblindOutputResult> {
  const inputBlindingData = new Map<number, confidential.UnblindOutputResult>();
  const txidToBuffer = function (txid: string) {
    return Buffer.from(txid, 'hex').reverse();
  };

  let index = -1;
  for (const input of psetToUnsignedTx(pset).ins) {
    index++;
    const utxo = utxos.find((u) => txidToBuffer(u.txid).equals(input.hash));
    if (!utxo) {
      throw new Error(`blindPSET error: utxo not found '${input.hash.reverse().toString('hex')}'`);
    }

    if (utxo.unblindData) {
      inputBlindingData.set(index, utxo.unblindData);
    }
  }

  return inputBlindingData;
}

async function blindPset(psetBase64: string, utxos: UtxoInterface[], outputAddresses: string[]) {
  const outputPubKeys = outPubKeysMap(psetBase64, outputAddresses);
  const inputBlindingData = inputBlindingDataMap(psetBase64, utxos);

  return (
    await decodePset(psetBase64).blindOutputsByIndex(inputBlindingData, outputPubKeys)
  ).toBase64();
}

/**
 * Take an unsigned pset, blind it according to recipientAddresses and sign the pset using the mnemonic.
 * @param signerIdentity Identity using to sign the tx. should be restored.
 * @param psetBase64 the unsign tx.
 * @param recipientAddresses a list of known recipients addresses (non wallet output addresses).
 */
export async function blindAndSignPset(
  psetBase64: string,
  selectedUtxos: UtxoInterface[],
  identities: IdentityInterface[],
  recipientAddresses: string[]
): Promise<string> {
  const outputAddresses: string[] = recipientAddresses;
  for (const id of identities) {
    outputAddresses.push(...(await id.getAddresses()).map((a) => a.confidentialAddress));
  }

  const blindedPset = await blindPset(psetBase64, selectedUtxos, outputAddresses);
  const signedPset = await signPset(blindedPset, identities);

  const decodedPset = decodePset(signedPset);
  if (!decodedPset.validateSignaturesOfAllInputs()) {
    throw new Error('PSET is not fully signed');
  }

  return decodedPset.finalizeAllInputs().extractTransaction().toHex();
}

export async function signPset(
  psetBase64: string,
  identities: IdentityInterface[]
): Promise<string> {
  let pset = psetBase64;
  for (const id of identities) {
    pset = await id.signPset(pset);
    try {
      if (decodePset(pset).validateSignaturesOfAllInputs()) break;
    } catch {
      continue;
    }
  }

  return pset;
}

function outputIndexFromAddress(tx: string, addressToFind: string): number {
  const utx = psetToUnsignedTx(tx);
  const recipientScript = addrLDK.toOutputScript(addressToFind);
  return utx.outs.findIndex((out) => out.script.equals(recipientScript));
}

/**
 * Create tx from a Topup object.
 * @param taxiTopup the topup describing the taxi response.
 * @param unspents a list of utxos used to fund the tx.
 * @param recipients a list of output to send.
 * @param coinSelector the way used to coin select the unspents.
 * @param changeAddressGetter define the way we get change addresses (if needed).
 */
export function createTaxiTxFromTopup(
  taxiTopup: Topup.AsObject,
  unspents: UtxoInterface[],
  recipients: RecipientInterface[],
  coinSelector: CoinSelector,
  changeAddressGetter: ChangeAddressFromAssetGetter
): string {
  const { selectedUtxos, changeOutputs } = coinSelector(
    unspents,
    recipients.concat({
      value: taxiTopup.assetAmount,
      asset: taxiTopup.assetHash,
      address: '', // address is not useful for coinSelector
    }),
    changeAddressGetter
  );
  return addToTx(taxiTopup.partial, selectedUtxos, recipients.concat(changeOutputs));
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
  unspents: UtxoInterface[],
  feeAssetHash: string,
  changeAddressGetter: ChangeAddressFromAssetGetter,
  network: Network,
  data?: DataRecipient[]
): Promise<string> {
  const coinSelector = greedyCoinSelector();

  if (feeAssetHash === lbtcAssetByNetwork(network)) {
    const targetRecipients = recipients.concat(
      data ? data.map((d) => ({ ...d, address: '' })) : []
    );

    const { selectedUtxos, changeOutputs } = coinSelector(
      unspents,
      targetRecipients,
      changeAddressGetter
    );

    // compute the amount according to tx size
    const feeOutput = createFeeOutput(
      selectedUtxos.length,
      changeOutputs.length + recipients.length + (data ? data.length : 0) + 1,
      0.1,
      feeAssetHash
    );

    const selection = coinSelector(
      unspents,
      targetRecipients.concat([feeOutput]),
      changeAddressGetter
    );

    const emptyTx = new Psbt({ network: networkFromString(network) }).toBase64();
    let pset = addToTx(
      emptyTx,
      selection.selectedUtxos,
      recipients.concat(selection.changeOutputs).concat([feeOutput])
    );

    if (data && data.length > 0) {
      pset = withDataOutputs(pset, data);
    }

    return pset;
  }

  const topup = (await fetchTopupFromTaxi(taxiURL[network], feeAssetHash)).topup;
  if (!topup) throw new Error('something went wrong with taxi');

  return createTaxiTxFromTopup(
    topup,
    unspents,
    recipients,
    greedyCoinSelector(),
    changeAddressGetter
  );
}

/**
 * extract the fee amount (in satoshi) from an unsigned transaction.
 * @param tx base64 encoded string.
 */
export const feeAmountFromTx = (tx: string): number => {
  const utx = psetToUnsignedTx(tx);
  const feeOutIndex = utx.outs.findIndex((out) => out.script.length === 0);
  const feeOut = utx.outs[feeOutIndex];
  return confidential.confidentialValueToSatoshi(feeOut.value);
};

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
  vin: Array<InputInterface>,
  vout: Array<BlindedOutputInterface | UnblindedOutputInterface>,
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
    if (
      input.prevout &&
      !isBlindedOutputInterface(input.prevout) &&
      walletScripts.includes(input.prevout.script)
    ) {
      addToTransfers(-1 * input.prevout.value, input.prevout.asset);
    }
  }

  let feeAmount = 0;
  let feeAsset = network.assetHash;

  for (const output of vout) {
    if (output.script === '') {
      // handle the fee output
      const feeOutput = output as UnblindedOutputInterface;
      feeAmount = feeOutput.value;
      feeAsset = feeOutput.asset;
      continue;
    }

    if (!isBlindedOutputInterface(output) && walletScripts.includes(output.script)) {
      addToTransfers(output.value, output.asset);
    }
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

// Add OP_RETURN outputs to psetBase64 (unsigned)
function withDataOutputs(psetBase64: string, dataOutputs: DataRecipient[]) {
  const pset = decodePset(psetBase64);

  for (const recipient of dataOutputs) {
    const opReturnPayment = payments.embed({ data: [Buffer.from(recipient.data, 'hex')] });
    pset.addOutput({
      script: opReturnPayment.output!,
      asset: recipient.asset,
      value: confidential.satoshiToConfidentialValue(recipient.value),
    });
  }

  return pset.toBase64();
}
