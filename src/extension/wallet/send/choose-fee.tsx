import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { address } from 'ldk';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_ADDRESS_AMOUNT_ROUTE, SEND_CONFIRMATION_ROUTE } from '../../routes/constants';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../../utility';
import useLottieLoader from '../../hooks/use-lottie-loader';
import { extractErrorMessage } from '../../utility/error';
import { Creator, networks, Transaction, Updater } from 'liquidjs-lib';
import type { Asset } from '../../../domain/asset';
import { computeBalances } from '../../../utils';
import {
  useSelectNetwork,
  useSelectTaxiAssets,
  useSelectUtxos,
  sendFlowRepository,
  walletRepository,
  assetRepository,
  appRepository,
} from '../../../infrastructure/storage/common';
import { MainAccount, MainAccountLegacy, MainAccountTest } from '../../../domain/account-type';
import { AccountFactory } from '../../../domain/account';

type Recipient = {
  address: string;
  asset: string;
  amount: number;
};

const ChooseFee: React.FC = () => {
  const history = useHistory();
  const network = useSelectNetwork();
  const taxiAssets = useSelectTaxiAssets();
  const [utxos, utxosLoading] = useSelectUtxos(MainAccount, MainAccountLegacy, MainAccountTest)();

  const [balances, setBalances] = useState<Record<string, number>>({});
  const [selectedFeeAsset, setSelectedFeeAsset] = useState<string>();
  const [assetDetails, setAssetDetails] = useState<Asset>();
  const [unsignedPset, setUnsignedPset] = useState<string>();
  const [feeStr, setFeeStr] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [recipient, setRecipient] = useState<Recipient>();

  useEffect(() => {
    (async () => {
      if (!selectedFeeAsset) return;
      const asset = await assetRepository.getAsset(selectedFeeAsset);
      setAssetDetails(asset);
    })().catch(console.error);
  }, [selectedFeeAsset]);

  useEffect(() => {
    (async () => {
      const address = await sendFlowRepository.getReceiverAddress();
      const asset = await sendFlowRepository.getSelectedAsset();
      const amount = await sendFlowRepository.getAmount();
      if (!address || !asset || !amount) {
        history.goBack();
        return;
      }
      setRecipient({ address, asset, amount });
    })().catch(console.error);
  }, []);

  useEffect(() => {
    if (utxosLoading) return;
    setBalances(computeBalances(utxos));
  }, [utxos]);

  const isTaxi = () =>
    taxiAssets.findIndex((asset) =>
      typeof asset === 'string' ? asset === selectedFeeAsset : asset.assetHash === selectedFeeAsset
    ) !== -1;

  const handleConfirm = async () => {
    try {
      if (!selectedFeeAsset) throw new Error('fee asset not selected');
      if (!unsignedPset) throw new Error('please select fee asset');
      setLoading(true);
      await sendFlowRepository.setUnsignedPset(unsignedPset);
      history.push({
        pathname: SEND_CONFIRMATION_ROUTE,
      });
    } catch (error: any) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackBtn = () => {
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };

  const handleError = (err: unknown) => {
    console.error(err);
    setError(extractErrorMessage(err));
    setUnsignedPset(undefined);
    setFeeStr(undefined);
    setSelectedFeeAsset(undefined);
  };

  const chooseFeeAndCreatePset = async (assetHash: string) => {
    if (selectedFeeAsset === assetHash || !network) {
      return; // skip if the same asset is selected
    }

    if (!recipient) {
      throw new Error('address/amount to send not found');
    }

    try {
      setLoading(true);
      setSelectedFeeAsset(assetHash);

      const pset = Creator.newPset();
      const coinSelection = await walletRepository.selectUtxos(
        network,
        [{ asset: recipient.asset, amount: recipient.amount }],
        true,
        MainAccount,
        MainAccountLegacy,
        MainAccountTest
      );

      const updater = new Updater(pset);

      // get the witness utxos from repository
      const witnessUtxos = await Promise.all(
        coinSelection.utxos.map((utxo) => {
          return walletRepository.getWitnessUtxo(utxo.txID, utxo.vout);
        })
      );

      updater.addInputs(
        coinSelection.utxos.map((utxo, i) => ({
          txid: utxo.txID,
          txIndex: utxo.vout,
          sighashType: Transaction.SIGHASH_ALL,
          witnessUtxo: witnessUtxos[i],
        }))
      );

      updater.addOutputs([
        {
          asset: recipient.asset,
          amount: recipient.amount,
          script: address.toOutputScript(recipient.address, networks[network]),
          blinderIndex: 0,
          blindingPublicKey: address.fromConfidential(recipient.address).blindingKey,
        },
      ]);

      const accountFactory = await AccountFactory.create(walletRepository, appRepository, [
        network,
      ]);
      const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
      const mainAccount = await accountFactory.make(network, accountName);

      if (coinSelection.changeOutputs && coinSelection.changeOutputs.length > 0) {
        const changeAddress = await mainAccount.getNextAddress(true);
        if (!changeAddress) {
          throw new Error('change address not found');
        }

        updater.addOutputs([
          {
            asset: coinSelection.changeOutputs[0].asset,
            amount: coinSelection.changeOutputs[0].amount,
            script: address.toOutputScript(changeAddress, networks[network]),
            blinderIndex: 0,
            blindingPublicKey: address.fromConfidential(changeAddress).blindingKey,
          },
        ]);
      }

      const chainSource = await appRepository.getChainSource(network);
      if (!chainSource) {
        throw new Error('chain source not found, cannot estimate fee');
      }

      const feeAmount = 360;

      if (recipient.asset === networks[network].assetHash && updater.pset.outputs.length > 1) {
        // subtract fee from change output
        updater.pset.outputs[1].value = updater.pset.outputs[1].value - feeAmount;
      } else {
        // reselect
        const newCoinSelection = await walletRepository.selectUtxos(
          network,
          [{ asset: networks[network].assetHash, amount: feeAmount }],
          true,
          MainAccount,
          MainAccountLegacy,
          MainAccountTest
        );

        const newWitnessUtxos = await Promise.all(
          newCoinSelection.utxos.map((utxo) => {
            return walletRepository.getWitnessUtxo(utxo.txID, utxo.vout);
          })
        );

        updater.addInputs(
          newCoinSelection.utxos.map((utxo, i) => ({
            txid: utxo.txID,
            txIndex: utxo.vout,
            sighashType: Transaction.SIGHASH_ALL,
            witnessUtxo: newWitnessUtxos[i],
          }))
        );

        if (newCoinSelection.changeOutputs && newCoinSelection.changeOutputs.length > 0) {
          const changeAddress = await mainAccount.getNextAddress(true);
          if (!changeAddress) {
            throw new Error('change address not found');
          }
          updater.addOutputs([
            {
              asset: newCoinSelection.changeOutputs[0].asset,
              amount: newCoinSelection.changeOutputs[0].amount,
              script: address.toOutputScript(changeAddress, networks[network]),
              blinderIndex: 0,
              blindingPublicKey: address.fromConfidential(changeAddress).blindingKey,
            },
          ]);
        }
      }

      // add the fee output
      updater.addOutputs([
        {
          asset: networks[network].assetHash,
          amount: feeAmount,
        },
      ]);

      setFeeStr(fromSatoshiStr(feeAmount, 8) + ' L-BTC');

      const psetBase64 = updater.pset.toBase64();
      setUnsignedPset(psetBase64);

      if (isTaxi()) {
        // TODO
        // make taxi topup tx
      }
    } catch (error: any) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const selectedAssetHashWithLbtcFallback = () =>
    selectedFeeAsset || networks[network ?? 'liquid'].assetHash;

  const circleLoaderRef = React.useRef(null);
  useLottieLoader(circleLoaderRef, '/assets/animations/circle-loader.json');

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance
        assetBalance={formatDecimalAmount(
          fromSatoshi(balances[selectedAssetHashWithLbtcFallback()] ?? 0)
        )}
        assetHash={selectedAssetHashWithLbtcFallback()}
        assetTicker={assetDetails?.ticker ?? ''}
        className="mt-4"
      />
      <div className="w-48 mx-auto border-b-0.5 border-graySuperLight pt-2 mb-6" />

      <div>
        <p key={0} className="text-sm font-medium">
          I pay fee in:
        </p>
        <div key={1} className="flex flex-row justify-center gap-0.5 mx-auto w-11/12 mt-2">
          {[
            {
              assetHash: networks[network ?? 'liquid'].assetHash,
              name: 'Liquid BTC',
              precision: 8,
              ticker: 'L-BTC',
            } as Asset,
            ...taxiAssets,
          ].map((asset, index) =>
            typeof asset !== 'string' ? (
              <Button
                className="flex-1"
                isOutline={selectedFeeAsset !== asset.assetHash}
                key={index}
                onClick={() => chooseFeeAndCreatePset(asset.assetHash)}
                roundedMd={true}
                textBase={true}
                extraData={asset}
                disabled={loading}
              >
                {asset.ticker || asset.assetHash.slice(0, 4).toUpperCase()}
              </Button>
            ) : (
              <Button
                className="flex-1"
                isOutline={selectedFeeAsset !== asset}
                key={index}
                onClick={() => chooseFeeAndCreatePset(asset)}
                roundedMd={true}
                textBase={true}
                extraData={asset}
                disabled={loading}
              >
                {asset.slice(0, 4).toUpperCase()}
              </Button>
            )
          )}
        </div>
      </div>

      {selectedFeeAsset && unsignedPset && (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">{feeStr ? feeStr : '...'}</span>
          </div>
          {taxiAssets.includes(selectedFeeAsset) && (
            <p className="text-primary mt-3.5 text-xs font-medium text-left">
              * Fee paid with Liquid taxi 🚕
            </p>
          )}
        </>
      )}
      {error && <p className="text-red line-clamp-2 mt-3 text-xs text-left break-all">{error}</p>}
      {loading && <div className="h-10 mx-auto" ref={circleLoaderRef} />}

      <Button
        className="bottom-20 right-8 absolute"
        onClick={handleConfirm}
        disabled={loading || selectedFeeAsset === undefined || unsignedPset === undefined}
      >
        Confirm
      </Button>
    </ShellPopUp>
  );
};

export default ChooseFee;
