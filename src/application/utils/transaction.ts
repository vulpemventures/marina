import {
  address,
  addToTx,
  BlindedOutputInterface,
  decodePset,
  InputInterface,
  isBlindedOutputInterface,
  networks,
  psetToUnsignedTx,
  RecipientInterface,
  TxInterface,
  UnblindedOutputInterface,
  UtxoInterface,
} from 'ldk';
import { address as addressLDK, confidential } from 'liquidjs-lib';
import { mnemonicWalletFromAddresses } from './restorer';
import { Address } from '../../domain/wallet/value-objects';
import { TransactionProps } from '../../domain/wallet/value-objects/transaction';
import { blindingKeyFromAddress, isConfidentialAddress } from './address';
import { lbtcAssetByNetwork, usdtAssetHash } from './network';
import { Network } from '../../domain/app/value-objects';
import {
  OutputBlinders,
  TxDisplayInterface,
  TxsByAssetsInterface,
  TxsByTxIdInterface,
  TxStatus,
  TxType,
} from '../../domain/transaction';
import { Assets } from '../../domain/asset';

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

export const feeAmountFromTx = (tx: string): number => {
  const utx = psetToUnsignedTx(tx);
  const feeOutIndex = utx.outs.findIndex((out) => out.script.length === 0);
  const feeOut = utx.outs[feeOutIndex];
  return confidential.confidentialValueToSatoshi(feeOut.value);
};

export const isChange = (a: Address): boolean | null =>
  a?.derivationPath ? a.derivationPath?.split('/')[4] === '1' : null;

export const extractInfoFromRawTxData = (
  vin: Array<InputInterface>,
  vout: Array<BlindedOutputInterface | UnblindedOutputInterface>,
  network: Network['value'],
  addresses: Address[],
  assetsInStore: Assets
): {
  address: string;
  amount: number;
  asset: string;
  feeAsset: string;
  taxiFeeAmount?: number;
  toSelf: boolean;
  type: TxType;
  blinders: OutputBlinders[];
} => {
  const assets = new Set<string>();
  let amount = 0,
    asset = '',
    address = '',
    changeAmount = 0,
    lbtcFeeAmount = 0,
    taxiFeeAmount = 0,
    feeAsset = '',
    hasBlindedOutput = false,
    toSelf = false,
    type: TxType = 'receive',
    vinTotalAmount = 0,
    voutTotalAmount = 0;

  const blinders: OutputBlinders[] = [];

  const isTaxi =
    !isBlindedOutputInterface(vin[0].prevout) &&
    vin[0].prevout.value === 1000 &&
    vin[0].prevout.asset === lbtcAssetByNetwork(network) &&
    !isBlindedOutputInterface(vout[0]) &&
    vout[0].asset === usdtAssetHash(assetsInStore);

  if (isTaxi) {
    taxiFeeAmount = !isBlindedOutputInterface(vout[0]) ? vout[0].value : 0;
    feeAsset = !isBlindedOutputInterface(vout[0]) ? vout[0].asset : '';
    type = 'send';

    // Infer payment asset
    // If more than one asset type in vin[1 - x]
    const assetsVin = new Set<string>();
    for (let i = 1; i < vin.length; i++) {
      if (!isBlindedOutputInterface(vin[i].prevout)) {
        try {
          assetsVin.add((vin[i].prevout as UnblindedOutputInterface).asset);
          // eslint-disable-next-line no-empty
        } catch (_) {}
      }
    }
    asset =
      assetsVin.size === 1
        ? (usdtAssetHash(assetsInStore) as string)
        : assetsVin.size === 2
        ? lbtcAssetByNetwork(network)
        : 'muliple assets';

    if (asset === lbtcAssetByNetwork(network)) {
      // Calculate payment amount for lbtc payment
      for (let i = 1; i < vin.length; i++) {
        if (
          !isBlindedOutputInterface(vin[i].prevout) &&
          (vin[i].prevout as UnblindedOutputInterface).asset === lbtcAssetByNetwork(network)
        ) {
          vinTotalAmount = vinTotalAmount
            ? vinTotalAmount + (vin[i].prevout as UnblindedOutputInterface).value
            : (vin[i].prevout as UnblindedOutputInterface).value;
        }
      }
      // Check if lbtc change
      vout.forEach((item) => {
        if (!isBlindedOutputInterface(item)) {
          // Exclude lbtc fee and filter asset
          if (item.script && item.asset === lbtcAssetByNetwork(network)) {
            voutTotalAmount = item.value;
          }
          // add blinders
          if (item.script && item.assetBlinder && item.valueBlinder) {
            blinders.push({
              asset: item.asset,
              value: item.value,
              assetBlinder: item.assetBlinder,
              valueBlinder: item.valueBlinder,
            });
          }
        }
      });

      amount = vinTotalAmount - voutTotalAmount;

      vout.forEach((item) => {
        // Get unconfidential address of the recipient from blinded output
        if (isBlindedOutputInterface(item)) {
          address = addressLDK.fromOutputScript(Buffer.from(item.script, 'hex'), networks[network]);
        }
      });
    } else {
      // Calculate payment amount for USDt payment
      const isPaymentToUnconf = vout.every((item) => !isBlindedOutputInterface(item));

      if (!isPaymentToUnconf) {
        // To confidential address
        for (let i = 1; i < vin.length; i++) {
          if (!isBlindedOutputInterface(vin[i].prevout)) {
            vinTotalAmount = vinTotalAmount
              ? vinTotalAmount + (vin[i].prevout as UnblindedOutputInterface).value
              : (vin[i].prevout as UnblindedOutputInterface).value;
          }
        }
        vout.forEach((item) => {
          if (!isBlindedOutputInterface(item)) {
            // Exclude lbtc fee
            if (item.script) {
              voutTotalAmount = voutTotalAmount ? voutTotalAmount + item.value : item.value;
            }
            // add blinders
            if (item.script && item.assetBlinder && item.valueBlinder) {
              blinders.push({
                asset: item.asset,
                value: item.value,
                assetBlinder: item.assetBlinder,
                valueBlinder: item.valueBlinder,
              });
            }
          }

          // Get unconfidential address of the recipient from blinded output
          if (isBlindedOutputInterface(item)) {
            address = addressLDK.fromOutputScript(
              Buffer.from(item.script, 'hex'),
              networks[network]
            );
          }
        });
        amount = vinTotalAmount - voutTotalAmount;
      } else {
        // To unconfidential address
        // TODO: need Taxi xpub to determine payment output
        amount = 0;
        address = '';
      }
    }

    return {
      address,
      amount,
      asset,
      feeAsset,
      taxiFeeAmount,
      toSelf,
      type,
      blinders,
    };

    // Non Taxi payment
  } else {
    // Determine asset and fee asset
    vin.forEach((item) => {
      if (!isBlindedOutputInterface(item.prevout)) {
        if (item.prevout.asset && item.prevout.script) {
          assets.add(item.prevout.asset);
        }
      }
    });
    vout.forEach((item) => {
      if (!isBlindedOutputInterface(item)) {
        if (item.asset && item.script) {
          assets.add(item.asset);
        } else if (item.asset && !item.script) {
          lbtcFeeAmount = item.value;
          feeAsset = item.asset;
        }
        // add blinders
        if (item.script && item.assetBlinder && item.valueBlinder) {
          blinders.push({
            asset: item.asset,
            value: item.value,
            assetBlinder: item.assetBlinder,
            valueBlinder: item.valueBlinder,
          });
        }
      }
    });
    if (feeAsset && assets.size > 1 && assets.has(feeAsset)) {
      assets.delete(feeAsset);
    }

    //
    vin.forEach((item) => {
      if (!isBlindedOutputInterface(item.prevout)) {
        if (item.prevout.asset && item.prevout.script && assets.has(item.prevout.asset)) {
          assets.add(item.prevout.asset);
          asset = item.prevout.asset;
          // Sum all inputs values
          vinTotalAmount = vinTotalAmount
            ? vinTotalAmount + item.prevout.value
            : item.prevout.value;
        }
      }
    });

    // Check if asset sent in full
    // Not a receive
    const allVinUnblinded = vin.every(({ prevout }) => !isBlindedOutputInterface(prevout));
    // Check if payment asset utxo(s) exist. Exclude blinded and fee utxos.
    const isPaymentAssetInVout = vout
      .filter((o) => !isBlindedOutputInterface(o))
      .filter((o) => o.script !== '')
      .every((o) => !assets.has((o as UnblindedOutputInterface).asset));
    // Asset sent in full
    if (allVinUnblinded && isPaymentAssetInVout) {
      type = 'send';
      // Get first blinded utxo for unconf address
      const blindedUtxo = vout.find((o) => isBlindedOutputInterface(o)) as BlindedOutputInterface;
      try {
        address = addressLDK.fromOutputScript(
          Buffer.from(blindedUtxo.script, 'hex'),
          networks[network]
        );
      } catch (error) {
        console.log(error);
      }
    }

    vout.forEach((item) => {
      if (!isBlindedOutputInterface(item)) {
        if (item.asset && item.script && assets.has(item.asset)) {
          const addrOfMine = addresses.find((c) => {
            return (
              c.unconfidentialAddress ===
              addressLDK.fromOutputScript(Buffer.from(item.script, 'hex'), networks[network])
            );
          });

          // Receive Tx - No unblind inputs
          if (!asset) {
            type = 'receive';
            if (addrOfMine?.value) {
              address = addressLDK.fromOutputScript(
                Buffer.from(item.script, 'hex'),
                networks[network]
              );
              amount = item.value;
            }
          }

          // Send Tx
          // Vout asset === unblind input asset
          if (item.asset === asset) {
            type = 'send';

            // Sending to unknown address
            if (!addrOfMine?.value) {
              address = addressLDK.fromOutputScript(
                Buffer.from(item.script, 'hex'),
                networks[network]
              );
              amount = item.value;
            }

            // Send to unconfidential address
            if (addrOfMine?.value && isChange(addrOfMine)) {
              changeAmount = item.value;
            }

            // Sending to yourself
            if (addrOfMine?.value && !isChange(addrOfMine)) {
              address = addressLDK.fromOutputScript(
                Buffer.from(item.script, 'hex'),
                networks[network]
              );
              amount = item.value;
              toSelf = true;
            }
          }

          // Set asset
          asset = item.asset;
          // Sum all outputs values
          voutTotalAmount = voutTotalAmount ? voutTotalAmount + item.value : item.value;
          // Add fee if same asset
          if (feeAsset === item.asset) {
            voutTotalAmount = voutTotalAmount + lbtcFeeAmount;
          }
        }
      } else {
        hasBlindedOutput = true;
      }
    });

    // Send with change output
    if (!!vinTotalAmount && !!voutTotalAmount) {
      // To unconfidential address
      if (!hasBlindedOutput) {
        if (toSelf && asset === lbtcAssetByNetwork(network)) {
          amount = vinTotalAmount - (changeAmount + lbtcFeeAmount);
        } else {
          amount = vinTotalAmount - changeAmount;
        }
      } else {
        // To confidential address
        amount = vinTotalAmount - voutTotalAmount;
      }
    }

    // Send without change
    if (!!vinTotalAmount && !voutTotalAmount) {
      amount = vinTotalAmount;
    }

    return {
      address,
      amount,
      asset,
      feeAsset,
      toSelf,
      type,
      blinders,
    };
  }
};

/**
 * Get txs details and restructure by asset hash or by txid
 * @param txs
 * @param network
 * @param addresses
 * @param assets
 */
export const getTxsDetails = (
  txs: TxInterface[],
  network: Network['value'],
  addresses: Address[],
  assets: Assets
) => {
  const txArray = txs?.map(
    (tx: TxInterface): TxDisplayInterface => {
      const {
        address,
        asset,
        feeAsset,
        amount,
        taxiFeeAmount,
        toSelf,
        type,
        blinders,
      } = extractInfoFromRawTxData(tx.vin, tx.vout, network, addresses, assets);

      const timeTxInBlock = new Date((tx.status.blockTime ?? 0) * 1000);
      return {
        txId: tx.txid,
        date: timeTxInBlock.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        dateContracted: timeTxInBlock.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        status: tx.status.confirmed ? ('confirmed' as TxStatus) : ('pending' as TxStatus),
        type,
        asset,
        amount,
        address,
        fee: taxiFeeAmount ? taxiFeeAmount : tx.fee,
        feeAsset,
        toSelf,
        blockTime: tx.status.blockTime ?? 0,
        blinders,
      };
    }
  );

  return {
    byAsset: {
      ...txArray?.reduce(
        (res: TxsByAssetsInterface, tx: TxDisplayInterface): TxsByAssetsInterface => {
          res[tx.asset] = res[tx.asset] ? [...res[tx.asset], tx] : [tx];
          return res;
        },
        {}
      ),
    },
    byTxId: {
      ...txArray?.reduce((res: TxsByTxIdInterface, tx: TxDisplayInterface): TxsByTxIdInterface => {
        return { ...res, [tx.txId]: tx };
      }, {}),
    },
  };
};
