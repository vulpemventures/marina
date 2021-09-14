import {
  address as addrLDK,
  addToTx,
  BlindedOutputInterface,
  ChangeAddressFromAssetGetter,
  CoinSelector,
  decodePset,
  getUnblindURLFromTx,
  InputInterface,
  isBlindedOutputInterface,
  psetToUnsignedTx,
  RecipientInterface,
  StateRestorerOpts,
  TxInterface,
  UnblindedOutputInterface,
  UtxoInterface
} from 'ldk';
import { confidential, networks } from 'liquidjs-lib';
import { blindingKeyFromAddress, isConfidentialAddress } from './address';
import { Transfer, TxDisplayInterface, TxStatusEnum, TxTypeEnum } from '../../domain/transaction';
import { Address } from '../../domain/address';
import { mnemonicWallet } from './restorer';

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

export async function blindAndSignPset(
  mnemonic: string,
  restorerOpts: StateRestorerOpts,
  chain: string,
  psetBase64: string,
  recipientAddresses: string[]
): Promise<string> {
  const mnemo = await mnemonicWallet(mnemonic, restorerOpts, chain);

  const outputAddresses = (await mnemo.getAddresses()).map((a) => a.confidentialAddress);

  const outputPubKeys = outPubKeysMap(psetBase64, outputAddresses.concat(recipientAddresses));
  const outputsToBlind = Array.from(outputPubKeys.keys());

  const blindedPset: string = await mnemo.blindPset(psetBase64, outputsToBlind, outputPubKeys);

  const signedPset: string = await mnemo.signPset(blindedPset);

  const ptx = decodePset(signedPset);
  if (!ptx.validateSignaturesOfAllInputs()) {
    throw new Error('Transaction containes invalid signatures');
  }
  return ptx.finalizeAllInputs().extractTransaction().toHex();
}

export function fillTaxiTx(
  psetBase64: string,
  unspents: UtxoInterface[],
  receipients: RecipientInterface[],
  taxiPayout: RecipientInterface,
  coinSelector: CoinSelector,
  changeAddressGetter: ChangeAddressFromAssetGetter
): string {
  const { selectedUtxos, changeOutputs } = coinSelector(
    unspents,
    receipients.concat(taxiPayout),
    changeAddressGetter
  );
  return addToTx(psetBase64, selectedUtxos, receipients.concat(changeOutputs));
}

function outputIndexFromAddress(tx: string, addressToFind: string): number {
  const utx = psetToUnsignedTx(tx);
  const receipientScript = addrLDK.toOutputScript(addressToFind);
  return utx.outs.findIndex((out) => out.script.equals(receipientScript));
}

export const feeAmountFromTx = (tx: string): number => {
  const utx = psetToUnsignedTx(tx);
  const feeOutIndex = utx.outs.findIndex((out) => out.script.length === 0);
  const feeOut = utx.outs[feeOutIndex];
  return confidential.confidentialValueToSatoshi(feeOut.value);
};

export const isChange = (a: Address): boolean | null =>
  a?.derivationPath ? a.derivationPath?.split('/')[4] === '1' : null;

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
    webExplorersBlinders: getUnblindURLFromTx(tx, '')
  };
}

export function txTypeAsString(txType: TxTypeEnum = TxTypeEnum.Unknow): string {
  switch (txType) {
    case TxTypeEnum.SelfTransfer:
      return 'Self Transfer';
    case TxTypeEnum.Deposit:
      return 'Received';
    case TxTypeEnum.Withdraw:
      return 'Sent';
    case TxTypeEnum.Swap:
      return 'Swap';
    case TxTypeEnum.Unknow:
      return 'Transaction';
  }
}

function txTypeFromTransfer(transfers: Transfer[]): TxTypeEnum {
  if (transfers.some(({ amount }) => amount === 0)) {
    return TxTypeEnum.SelfTransfer;
  }

  if (transfers.length === 1) {
    if (transfers[0].amount > 0) {
      return TxTypeEnum.Deposit;
    }

    if (transfers[0].amount < 0) {
      return TxTypeEnum.Withdraw;
    }
  }

  if (transfers.length === 2) {
    return TxTypeEnum.Swap;
  }

  return TxTypeEnum.Unknow;
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
      asset
    });
  };

  for (const input of vin) {
    if (!isBlindedOutputInterface(input.prevout) && walletScripts.includes(input.prevout.script)) {
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
