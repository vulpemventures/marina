import {
  address,
  addToTx,
  BlindedOutputInterface,
  decodePset,
  getUnblindURLFromTx,
  InputInterface,
  isBlindedOutputInterface,
  makeUnblindURL,
  psetToUnsignedTx,
  RecipientInterface,
  TxInterface,
  UnblindedOutputInterface,
  UtxoInterface,
} from 'ldk';
import { confidential } from 'liquidjs-lib';
import { mnemonicWalletFromAddresses } from './restorer';
import { blindingKeyFromAddress, isConfidentialAddress } from './address';
import { lbtcAssetByNetwork } from './network';
import {
  Transaction,
  Transfer,
  TxDisplayInterface,
  TxStatusEnum,
  TxTypeEnum,
} from '../../domain/transaction';
import { Address } from '../../domain/address';
import moment from 'moment';


export const blindingInfoFromPendingTx = (
  { pset, sendAddress, feeAsset, changeAddress }: Transaction,
  network: string
): any => {
  if (!changeAddress) {
    throw new Error('changeAddress is undefined');
  }

  const outPubkeys: Map<number, string> = new Map();
  const blindReceipientOutput = isConfidentialAddress(sendAddress);

  const receipientOutIndex = outputIndexFromAddress(pset, sendAddress);
  const changeOutIndex = outputIndexFromAddress(pset, changeAddress.unconfidentialAddress!);

  outPubkeys.set(changeOutIndex, changeAddress.blindingKey!.toString('hex'));

  if (blindReceipientOutput) {
    const receipientBlindingKey = blindingKeyFromAddress(sendAddress);
    outPubkeys.set(receipientOutIndex, receipientBlindingKey);
  }

  const tx = psetToUnsignedTx(pset);

  const lbtcAsset: string = lbtcAssetByNetwork(network);
  const payFeesWithTaxi: boolean = feeAsset !== lbtcAsset;
  const outputsToBlind: number[] = [];

  if (payFeesWithTaxi) {
    // if paying fees with taxi, the first 2 outputs of the tx, which are those
    // added by taxi, must be excluded in outputsToBlind. All other outputs will
    // be blinded (receipient one only if pendingTx' senderAddress is confidential)
    tx.outs.forEach((out, i) => {
      if (i > 1) {
        if (i !== receipientOutIndex) {
          outputsToBlind.push(i);
        } else {
          if (blindReceipientOutput) {
            outputsToBlind.push(i);
          }
        }
      }
    });
  } else {
    // if paying fees in L-BTC instead, blind all outputs. Only the receipient
    // one deserves to be checkes in case it's an unconf address.
    tx.outs.forEach((out, i) => {
      if (out.script.length > 0) {
        if (i !== receipientOutIndex) {
          outputsToBlind.push(i);
        } else {
          if (blindReceipientOutput) {
            outputsToBlind.push(i);
          }
        }
      }
    });
  }

  return { outputsToBlind, outPubkeys };
};

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
  const receipientScript = address.toOutputScript(addressToFind);
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
  walletScripts: string[]
): TxDisplayInterface {
  const transfers = getTransfers(tx.vin, tx.vout, walletScripts);
  return {
    txId: tx.txid,
    blockTime: tx.status.blockTime
      ? moment(tx.status.blockTime * 1000)
      : undefined,
    status: tx.status.confirmed ? TxStatusEnum.Confirmed : TxStatusEnum.Pending,
    fee: tx.fee,
    transfers,
    type: txTypeFromTransfer(transfers),
    explorerURL: getUnblindURLFromTx(tx, 'https://blockstream.info/liquid')
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

  if (transfers.length == 2) {
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
    const transferIndex = transfers.findIndex(
      (t) => t.asset.valueOf() === asset.valueOf()
    );

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
      !isBlindedOutputInterface(input.prevout) &&
      walletScripts.includes(input.prevout.script)
    ) {
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