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
import { fromSatoshiFixed } from '../../presentation/utils';
import { lbtcAssetByNetwork } from './network';
import { Network } from '../../domain/app/value-objects';
import {
  TxDisplayInterface,
  TxsByAssetsInterface,
  TxsByTxIdInterface,
  TxType,
} from '../../domain/transaction';

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
  return fromSatoshiFixed(confidential.confidentialValueToSatoshi(feeOut.value), 8, 8);
};

export const extractInfoFromRawTxData = (
  vin: Array<InputInterface>,
  vout: Array<BlindedOutputInterface | UnblindedOutputInterface>,
  network: Network['value'],
  confidentialAddresses: Address[]
): {
  address: string;
  amount: number;
  asset: string;
  feeAsset: string;
  type: TxType;
} => {
  const assets = new Set<string>();
  let amount = 0,
    asset = '',
    address = '',
    feeAmount = 0,
    feeAsset = '',
    type: TxType = 'receive',
    vinTotalAmount = 0,
    voutTotalAmount = 0;

  // Determine asset
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
        feeAmount = item.value;
        feeAsset = item.asset;
      }
    }
  });
  if (feeAsset && assets.size > 1 && assets.has(feeAsset)) {
    assets.delete(feeAsset);
  }

  //
  vin.forEach((item) => {
    //console.log('VIN item', item);

    if (!isBlindedOutputInterface(item.prevout)) {
      if (item.prevout.asset && item.prevout.script && assets.has(item.prevout.asset)) {
        assets.add(item.prevout.asset);
        type = 'receive';
        asset = item.prevout.asset;
        address = addressLDK.fromOutputScript(
          Buffer.from(item.prevout.script, 'hex'),
          networks[network]
        );
        // Sum all inputs values
        vinTotalAmount = vinTotalAmount ? vinTotalAmount + item.prevout.value : item.prevout.value;
      }
    }
  });

  vout.forEach((item) => {
    if (!isBlindedOutputInterface(item)) {
      if (item.asset && item.script && assets.has(item.asset)) {
        // Workaround to check if utxo address is ours.
        address = addressLDK.fromOutputScript(Buffer.from(item.script, 'hex'), networks[network]);
        const isMine = confidentialAddresses?.some((c) => c.unconfidentialAddress === address);

        // Receive Tx - No unblind inputs
        if (!asset) {
          type = 'receive';
          if (isMine) {
            amount = item.value;
          }
        }

        // Send Tx - Unblind input asset
        if (item.asset === asset) {
          type = 'send';
          if (!isMine) {
            amount = item.value;
          }
        }

        // Set asset
        asset = item.asset;

        // Sum all outputs values
        voutTotalAmount = voutTotalAmount ? voutTotalAmount + item.value : item.value;

        // Add fee if same asset
        if (feeAsset === item.asset) {
          voutTotalAmount = voutTotalAmount + feeAmount;
        }
      }
    }
  });

  // Send with change output
  if (!!vinTotalAmount && !!voutTotalAmount) {
    // console.log(
    //   'vinTotalAmount && voutTotalAmount',
    //   !!vinTotalAmount && !!voutTotalAmount,
    //   vinTotalAmount,
    //   voutTotalAmount
    // );

    amount = vinTotalAmount - voutTotalAmount;

    //console.log('amount', amount);
  }

  // Send without change
  if (!!vinTotalAmount && !voutTotalAmount) {
    // console.log(
    //   'vinTotalAmount && !voutTotalAmount',
    //   !!vinTotalAmount && !voutTotalAmount,
    //   vinTotalAmount,
    //   !voutTotalAmount
    // );
    amount = vinTotalAmount;
  }

  // amount = vinTotalAmount
  //   ? vinTotalAmount
  //     ? vinTotalAmount - vinTotalAmount
  //     : vinTotalAmount
  //   : vinTotalAmount;

  return {
    address,
    amount,
    asset,
    feeAsset,
    type,
  };
};

/**
 * Get txs details and restructure by asset hash or by txid
 * @param txs
 * @param network
 * @param confidentialAddresses
 */
export const getTxsDetails = (
  txs: TxInterface[],
  network: Network['value'],
  confidentialAddresses: Address[]
) => {
  const txArray = txs?.map(
    (tx: TxInterface): TxDisplayInterface => {
      const { address, asset, feeAsset, amount, type } = extractInfoFromRawTxData(
        tx.vin,
        tx.vout,
        network,
        confidentialAddresses
      );

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
        status: tx.status.confirmed ? 'confirmed' : 'pending',
        type,
        asset,
        amount,
        address,
        fee: tx.fee,
        feeAsset,
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
