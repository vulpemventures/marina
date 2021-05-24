import {
  address as addrLDK,
  addToTx,
  BlindedOutputInterface,
  decodePset,
  getUnblindURLFromTx,
  InputInterface,
  isBlindedOutputInterface,
  psetToUnsignedTx,
  RecipientInterface,
  TxInterface,
  UnblindedOutputInterface,
  UtxoInterface,
} from 'ldk';
import { confidential } from 'liquidjs-lib';
import { mnemonicWalletFromAddresses } from './restorer';
import { blindingKeyFromAddress, isConfidentialAddress } from './address';
import { Transfer, TxDisplayInterface, TxStatusEnum, TxTypeEnum } from '../../domain/transaction';
import { Address } from '../../domain/address';
import moment from 'moment';

export function outPubKeysMap(pset: string, outputAddresses: string[]): Map<number, string> {
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

export const blindAndSignPset = async (
  mnemonic: string,
  masterBlindingKey: string,
  addresses: Address[],
  chain: string,
  psetBase64: string,
  outputsToBlind: number[],
  outPubkeys: Map<number, string>
): Promise<string> => {
  const mnemonicWallet = await mnemonicWalletFromAddresses(
    mnemonic,
    masterBlindingKey,
    addresses,
    chain
  );

  const blindedPset: string = await mnemonicWallet.blindPset(
    psetBase64,
    outputsToBlind,
    outPubkeys
  );

  const signedPset: string = await mnemonicWallet.signPset(blindedPset);

  const ptx = decodePset(signedPset);
  if (!ptx.validateSignaturesOfAllInputs()) {
    throw new Error('Transaction containes invalid signatures');
  }
  return ptx.finalizeAllInputs().extractTransaction().toHex();
};

export const fillTaxiTx = (
  psetBase64: string,
  unspents: UtxoInterface[],
  receipients: RecipientInterface[],
  taxiPayout: RecipientInterface,
  coinSelector: any,
  changeAddressGetter: any
): string => {
  const { selectedUtxos, changeOutputs } = coinSelector(
    unspents,
    receipients.concat(taxiPayout),
    changeAddressGetter
  );
  return addToTx(psetBase64, selectedUtxos, receipients.concat(changeOutputs));
};

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
export function toDisplayTransaction(tx: TxInterface, walletScripts: string[]): TxDisplayInterface {
  const transfers = getTransfers(tx.vin, tx.vout, walletScripts);
  return {
    txId: tx.txid,
    blockTime: tx.status.blockTime ? moment(tx.status.blockTime * 1000) : undefined,
    status: tx.status.confirmed ? TxStatusEnum.Confirmed : TxStatusEnum.Pending,
    fee: tx.fee,
    transfers,
    type: txTypeFromTransfer(transfers),
    explorerURL: getUnblindURLFromTx(tx, 'https://blockstream.info/liquid'),
  };
}

export function txTypeAsString(txType: TxTypeEnum = TxTypeEnum.Unknow): string {
  switch (txType) {
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

function txTypeFromTransfer(transfers: Transfer[]) {
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
  walletScripts: string[]
): Transfer[] {
  const transfers: Transfer[] = [];

  const addToTransfers = (amount: number, asset: string) => {
    const transferIndex = transfers.findIndex((t) => t.asset.valueOf() === asset.valueOf());

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
    if (!isBlindedOutputInterface(input.prevout) && walletScripts.includes(input.prevout.script)) {
      addToTransfers(-1 * input.prevout.value, input.prevout.asset);
    }
  }

  for (const output of vout) {
    if (
      !isBlindedOutputInterface(output) &&
      walletScripts.includes(output.script) &&
      output.script !== ''
    ) {
      addToTransfers(output.value, output.asset);
    }
  }

  return transfers;
}
