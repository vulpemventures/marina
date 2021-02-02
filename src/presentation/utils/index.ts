import {
  decodePset,
  networks,
  psetToUnsignedHex,
  address,
} from 'ldk';
import { Transaction, confidential } from 'liquidjs-lib';
import { walletFromAddresses } from '../../application/utils/restorer';
import { Address } from '../../domain/wallet/value-objects';

export const formatAddress = (addr: string): string => {
  return `${addr.substring(0, 9)}...${addr.substring(addr.length - 9, addr.length)}`;
};

export const formatNetwork = (net: string): string => {
  return net.charAt(0).toUpperCase().concat(net.slice(1));
};

export const rawFeeAsset = (net: string): string => {
  if (net.toLocaleLowerCase() === 'regtest') {
    return networks.regtest.assetHash;
  }
  return networks.liquid.assetHash;
};

export const unsignedTxFromPset = (tx: string): Transaction => {
  return Transaction.fromHex(psetToUnsignedHex(tx));
};

export const receipientOutIndexFromTx = (tx: string, receipientAddress: string): number => {
  const utx = unsignedTxFromPset(tx);
  const receipientScript = address.toOutputScript(receipientAddress);
  return utx.outs.findIndex((out) => out.script.equals(receipientScript));
};

export const feeAmountFromTx = (tx: string): string => {
  const utx = unsignedTxFromPset(tx);
  const feeOutIndex = utx.outs.findIndex((out) => out.script.length === 0);
  const feeOut = utx.outs[feeOutIndex];
  return (confidential.confidentialValueToSatoshi(feeOut.value) / Math.pow(10, 8)).toFixed(8);
};

export const blindAndSignPset = async (
  mnemonic: string,
  addresses: Address[],
  chain: string,
  psetBase64: string,
  outPubkeys: Map<number, string>
): Promise<string> => {
  const mnemonicWallet = await walletFromAddresses(mnemonic, addresses, chain);

  const tx = unsignedTxFromPset(psetBase64);
  let outputsToBlind: number[] = [];
  tx.outs.forEach((out, i) => {
    if (out.script.length > 0) {
      return outputsToBlind.push(i);
    }
  });

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

export const blindingKeyFromAddress = (addr: string): string => {
  return address.fromConfidential(addr).blindingKey.toString('hex');
};

export const isConfidentialAddress = (addr: string): boolean => {
  try {
    address.fromConfidential(addr);
    return true;
  } catch (ignore) {
    return false;
  }
};
