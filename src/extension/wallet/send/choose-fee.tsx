import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_ADDRESS_AMOUNT_ROUTE, SEND_CONFIRMATION_ROUTE } from '../../routes/constants';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../../utility';
import useLottieLoader from '../../hooks/use-lottie-loader';
import { extractErrorMessage } from '../../utility/error';
import { networks } from 'liquidjs-lib';
import { computeBalances, makeSendPsetFromMainAccounts } from '../../../utils';
import {
  useSelectNetwork,
  useSelectTaxiAssets,
  useSelectUtxos,
  sendFlowRepository,
  assetRepository,
} from '../../../infrastructure/storage/common';
import type { AddressRecipient, Asset } from 'marina-provider';
import { MainAccount, MainAccountLegacy, MainAccountTest } from '../../../domain/account';

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
  const [recipient, setRecipient] = useState<AddressRecipient>();

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
      const value = await sendFlowRepository.getAmount();
      if (!address || !asset || !value) {
        history.goBack();
        return;
      }
      setRecipient({ address, asset, value });
    })().catch(console.error);
  }, []);

  useEffect(() => {
    if (utxosLoading) return;
    setBalances(computeBalances(utxos));
  }, [utxos]);

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
    if (selectedFeeAsset === assetHash) throw new Error('asset already selected');
    if (!network) throw new Error('network not selected');

    if (!recipient) {
      throw new Error('address/amount to send not found');
    }

    try {
      setLoading(true);
      setSelectedFeeAsset(assetHash);
      const { pset, feeAmount } = await makeSendPsetFromMainAccounts([recipient], [], assetHash);
      setFeeStr(fromSatoshiStr(feeAmount, 8) + ' L-BTC');
      const psetBase64 = pset.toBase64();
      setUnsignedPset(psetBase64);
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
