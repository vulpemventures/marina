import {
  decodePset,
  networks,
  psetToUnsignedTx,
  address,
  UtxoInterface,
  RecipientInterface,
  addToTx,
  Outpoint,
} from 'ldk';
import { confidential } from 'liquidjs-lib';
import { TaxiClient } from 'taxi-protobuf/generated/js/TaxiServiceClientPb';
import { TopupWithAssetReply, TopupWithAssetRequest } from 'taxi-protobuf/generated/js/taxi_pb';
import { mnemoincWalletFromAddresses } from '../../application/utils/restorer';
import { Address } from '../../domain/wallet/value-objects';
import { TransactionProps } from '../../domain/wallet/value-objects/transaction';

export const assetInfoByHash: Record<string, any> = {
  '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
    ticker: 'L-BTC',
    name: 'Liquid Bitcoin',
    imgPath: 'assets/images/liquid-assets/liquid-btc.svg',
  },
  dd24d2403e233bb7384232534c777c604d36177ce5019bc21dd2022d803f9e67: {
    ticker: 'USDt',
    name: 'Tether',
    imgPath: 'assets/images/liquid-assets/liquid-tether.png',
  },
};
export const assetInfoByTicker: Record<string, any> = {
  'L-BTC': {
    name: 'Liquid Bitcoin',
    imgPath: 'assets/images/liquid-assets/liquid-btc.svg',
    hash: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
  },
  USDt: {
    ticker: 'USDt',
    name: 'Tether',
    hash: 'dd24d2403e233bb7384232534c777c604d36177ce5019bc21dd2022d803f9e67',
  },
};

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

export const receipientOutIndexFromTx = (tx: string, receipientAddress: string): number => {
  const utx = psetToUnsignedTx(tx);
  const receipientScript = address.toOutputScript(receipientAddress);
  return utx.outs.findIndex((out) => out.script.equals(receipientScript));
};

export const feeAmountFromTx = (tx: string): string => {
  const utx = psetToUnsignedTx(tx);
  const feeOutIndex = utx.outs.findIndex((out) => out.script.length === 0);
  const feeOut = utx.outs[feeOutIndex];
  return (confidential.confidentialValueToSatoshi(feeOut.value) / Math.pow(10, 8)).toFixed(8);
};

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
  console.log('FINAL UNSIGNED TX HEX', tx.toHex());
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
  const mnemonicWallet = await mnemoincWalletFromAddresses(
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

export const fetchTopupFromTaxi = async (
  taxiUrl: string,
  asset: string
): Promise<TopupWithAssetReply.AsObject> => {
  const client = new TaxiClient(taxiUrl, undefined);
  const request = new TopupWithAssetRequest();
  request.setAssetHash(asset);
  const res = await client.topupWithAsset(request, null);
  return res.toObject();
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

export const utxoMapToArray = (utxoMap: Map<Outpoint, UtxoInterface>): UtxoInterface[] => {
  const utxos: UtxoInterface[] = [];
  utxoMap.forEach((utxo) => {
    utxos.push(utxo);
  });
  return utxos;
};

const lbtcAssetByNetwork = (net: string): string => {
  if (net === 'regtest') {
    return networks.regtest.assetHash;
  }
  return networks.liquid.assetHash;
};
