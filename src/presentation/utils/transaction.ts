import {
  address,
  addToTx,
  decodePset,
  psetToUnsignedTx,
  RecipientInterface,
  UtxoInterface,
} from 'ldk';
import { confidential } from 'liquidjs-lib';
import { mnemonicWalletFromAddresses } from '../../application/utils/restorer';
import { Address } from '../../domain/wallet/value-objects';
import { TransactionProps } from '../../domain/wallet/value-objects/transaction';
import { blindingKeyFromAddress, isConfidentialAddress } from './address';
import { formatAmount } from './format';
import { lbtcAssetByNetwork } from './network';

export const blindingInfoFromPendingTx = (
  { value, sendAddress, feeAsset }: TransactionProps,
  network: string
): any => {
  const outPubkeys: Map<number, string> = new Map();
  const blindReceipientOutput = isConfidentialAddress(sendAddress);
  const receipientOutIndex = receipientOutIndexFromTx(value, sendAddress);

  if (isConfidentialAddress(sendAddress)) {
    const receipientBlindingKey = blindingKeyFromAddress(sendAddress);
    outPubkeys.set(receipientOutIndex, receipientBlindingKey);
  }

  const tx = psetToUnsignedTx(value);

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

export const receipientOutIndexFromTx = (tx: string, receipientAddress: string): number => {
  const utx = psetToUnsignedTx(tx);
  const receipientScript = address.toOutputScript(receipientAddress);
  return utx.outs.findIndex((out) => out.script.equals(receipientScript));
};

export const feeAmountFromTx = (tx: string): string => {
  const utx = psetToUnsignedTx(tx);
  const feeOutIndex = utx.outs.findIndex((out) => out.script.length === 0);
  const feeOut = utx.outs[feeOutIndex];
  return formatAmount(confidential.confidentialValueToSatoshi(feeOut.value));
};
