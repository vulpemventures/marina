import {
  address as addrLDK,
  addToTx,
  ChangeAddressFromAssetGetter,
  CoinSelector,
  createFeeOutput,
  decodePset,
  getUnblindURLFromTx,
  greedyCoinSelector,
  Mnemonic,
  psetToUnsignedTx,
  RecipientInterface,
  TxInterface,
  UnblindedOutput,
  CoinSelectorErrorFn,
  isUnblindedOutput,
  getSats,
  getAsset,
  NetworkString,
} from 'ldk';
import { confidential, networks, payments, Psbt } from 'liquidjs-lib';
import { blindingKeyFromAddress, isConfidentialAddress } from './address';
import { Transfer, TxDisplayInterface, TxStatusEnum, TxType } from '../../domain/transaction';
import { lbtcAssetByNetwork } from './network';
import { fetchTopupFromTaxi, Topup } from './taxi';
import { taxiURL } from './constants';
import { DataRecipient, isAddressRecipient, isDataRecipient, Recipient } from 'marina-provider';

function outPubKeysMap(pset: string, outputAddresses: string[]): Map<number, string> {
  const outPubkeys: Map<number, string> = new Map();

  for (const outAddr of outputAddresses) {
    const index = outputIndexFromAddress(pset, outAddr);
    if (index === -1) continue;
    if (isConfidentialAddress(outAddr)) {
      const blindingPublicKey = blindingKeyFromAddress(outAddr);
      outPubkeys.set(index, blindingPublicKey);
    }
  }

  return outPubkeys;
}

/**
 * Take an unsigned pset, blind it according to recipientAddresses and sign the pset using the mnemonic.
 * @param mnemonic Identity using to sign the tx. should be restored.
 * @param psetBase64 the unsign tx.
 * @param recipientAddresses a list of known recipients addresses (non wallet output addresses).
 */
export async function blindAndSignPset(
  mnemonic: Mnemonic,
  psetBase64: string,
  recipientAddresses: string[]
): Promise<string> {
  const outputAddresses = (await mnemonic.getAddresses()).map((a) => a.confidentialAddress);

  const outputPubKeys = outPubKeysMap(psetBase64, outputAddresses.concat(recipientAddresses));
  const outputsToBlind = Array.from(outputPubKeys.keys());

  const blindedPset: string = await mnemonic.blindPset(psetBase64, outputsToBlind, outputPubKeys);

  const signedPset: string = await mnemonic.signPset(blindedPset);

  const ptx = decodePset(signedPset);
  if (!ptx.validateSignaturesOfAllInputs()) {
    throw new Error('Transaction containes invalid signatures');
  }
  return ptx.finalizeAllInputs().extractTransaction().toHex();
}

function outputIndexFromAddress(tx: string, addressToFind: string): number {
  const utx = psetToUnsignedTx(tx);
  const recipientScript = addrLDK.toOutputScript(addressToFind);
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
 * @param taxiTopup the topup describing the taxi response.
 * @param unspents a list of utxos used to fund the tx.
 * @param recipients a list of output to send.
 * @param coinSelector the way used to coin select the unspents.
 * @param changeAddressGetter define the way we get change addresses (if needed).
 */
export function createTaxiTxFromTopup(
  taxiTopup: Topup,
  unspents: UnblindedOutput[],
  recipients: RecipientInterface[],
  coinSelector: CoinSelector,
  changeAddressGetter: ChangeAddressFromAssetGetter
): string {
  const { selectedUtxos, changeOutputs } = coinSelector(throwErrorCoinSelector)(
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
  unspents: UnblindedOutput[],
  feeAssetHash: string,
  changeAddressGetter: ChangeAddressFromAssetGetter,
  network: NetworkString,
  data?: DataRecipient[]
): Promise<string> {
  const coinSelector = greedyCoinSelector();

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
      changeOutputs.length + recipients.length + (data ? data.length : 0) + 1,
      0.1,
      feeAssetHash
    );

    const selection = coinSelector(throwErrorCoinSelector)(
      unspents,
      targetRecipients.concat([feeOutput]),
      changeAddressGetter
    );

    const emptyTx = new Psbt({ network: networks[network] }).toBase64();
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
    if (
      input.prevout &&
      isUnblindedOutput(input.prevout) &&
      walletScripts.includes(input.prevout.prevout.script.toString('hex'))
    ) {
      addToTransfers(-1 * getSats(input.prevout), getAsset(input.prevout));
    }
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

    if (
      isUnblindedOutput(output) &&
      walletScripts.includes(output.prevout.script.toString('hex'))
    ) {
      addToTransfers(getSats(output), getAsset(output));
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
