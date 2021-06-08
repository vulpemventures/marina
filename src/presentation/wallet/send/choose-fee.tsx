import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { greedyCoinSelector, MasterPublicKey, RecipientInterface, walletFromCoins } from 'ldk';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_ADDRESS_AMOUNT_ROUTE, SEND_CONFIRMATION_ROUTE } from '../../routes/constants';
import {
  feeAmountFromTx,
  feeLevelToSatsPerByte,
  fetchTopupFromTaxi,
  fillTaxiTx,
  imgPathMapMainnet,
  imgPathMapRegtest,
  lbtcAssetByNetwork,
  taxiURL,
} from '../../../application/utils';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../../utils';
import useLottieLoader from '../../hooks/use-lottie-loader';
import { IWallet } from '../../../domain/wallet';
import { IAssets } from '../../../domain/assets';
import { useDispatch } from 'react-redux';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import {
  setFeeAssetAndAmount,
  setFeeChangeAddress,
  setPset,
} from '../../../application/redux/actions/transaction';
import { setAddress } from '../../../application/redux/actions/wallet';
import { Network } from '../../../domain/network';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { Address, createAddress } from '../../../domain/address';
import { Topup } from 'taxi-protobuf/generated/js/taxi_pb';

export interface ChooseFeeProps {
  network: Network;
  assets: IAssets;
  changeAddress?: Address;
  sendAmount: number;
  sendAddress?: Address;
  sendAsset: string;
  wallet: IWallet;
  balances: BalancesByAsset;
  taxiAssets: string[];
  lbtcAssetHash: string;
  masterPubKey: MasterPublicKey;
}

const ChooseFeeView: React.FC<ChooseFeeProps> = ({
  network,
  assets,
  changeAddress,
  sendAmount,
  sendAddress,
  sendAsset,
  wallet,
  balances,
  taxiAssets,
  lbtcAssetHash,
  masterPubKey,
}) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const [feeCurrency, setFeeCurrency] = useState<string | undefined>(lbtcAssetHash);
  const [feeLevel] = useState<string>('50');
  const [unsignedPendingTx, setUnsignedPendingTx] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [feeChange, setFeeChange] = useState<Address>();
  const [topup, setTopup] = useState<Topup.AsObject>();

  const circleLoaderRef = React.useRef(null);
  useLottieLoader(circleLoaderRef, '/assets/animations/circle-loader.json');

  useEffect(() => {
    if (!loading) updatePendingTx().catch(console.error);
  }, [feeCurrency]);

  const updatePendingTx = async () => {
    if (!feeCurrency) return;
    setLoading(true);
    setErrorMessage(undefined);
    try {
      if (!sendAddress) throw new Error('sendAddress is undefined');

      const recipients = [
        {
          asset: sendAsset,
          value: sendAmount,
          address: sendAddress.value,
        },
      ];

      if (feeCurrency === lbtcAssetByNetwork(network)) {
        createTx(recipients);
      } else if (taxiAssets.includes(feeCurrency)) {
        await createTaxiTx(recipients);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage((err as Error).message);
      setFeeCurrency(undefined);
      setFeeChange(undefined);
      setTopup(undefined);
    } finally {
      setLoading(false);
    }
  };

  const createTx = (recipients: RecipientInterface[]) => {
    // no taxi
    setFeeChange(undefined);
    const w = walletFromCoins(Object.values(wallet.utxoMap), network);
    const currentSatsPerByte = feeLevelToSatsPerByte[feeLevel];
    const tx: string = w.buildTx(
      w.createTx(),
      recipients,
      greedyCoinSelector(),
      () => changeAddress?.value,
      true,
      currentSatsPerByte
    );
    setUnsignedPendingTx(tx);
    return;
  };

  const createTaxiTx = async (recipients: RecipientInterface[]) => {
    if (!feeCurrency) throw new Error('feeCurrency is undefined');

    let taxiTopup = topup;
    if (!taxiTopup || feeCurrency !== taxiTopup.assetHash) {
      taxiTopup = (await fetchTopupFromTaxi(taxiURL[network], feeCurrency)).topup;
      setTopup(taxiTopup);
    }

    if (!taxiTopup) {
      throw new Error('Taxi topup is undefined');
    }

    const taxiPayout: RecipientInterface = {
      value: taxiTopup.assetAmount,
      asset: taxiTopup.assetHash,
      address: '',
    };

    let nextChangeAddr = feeChange;
    if (!nextChangeAddr) {
      const next = await masterPubKey.getNextChangeAddress();
      nextChangeAddr = createAddress(next.confidentialAddress, next.derivationPath);
      setFeeChange(nextChangeAddr);
    }

    const changeGetter = (asset: string) => {
      if (asset === sendAsset) {
        return changeAddress?.value;
      }
      return nextChangeAddr?.value;
    };

    const tx: string = fillTaxiTx(
      taxiTopup.partial,
      Object.values(wallet.utxoMap),
      recipients,
      taxiPayout,
      greedyCoinSelector(),
      changeGetter
    );

    setUnsignedPendingTx(tx);
    return;
  };

  // send the transaction
  const handleConfirm = async () => {
    if (!feeCurrency) return;

    setLoading(true);
    try {
      let feeAmount: number;
      if (feeCurrency === lbtcAssetByNetwork(network)) {
        feeAmount = feeAmountFromTx(unsignedPendingTx);
      } else {
        feeAmount = topup?.assetAmount || 0;
      }

      await Promise.all([
        dispatch(setPset(unsignedPendingTx)),
        dispatch(setFeeAssetAndAmount(feeCurrency, feeAmount)),
      ]);

      if (feeChange) {
        await Promise.all([
          dispatch(setFeeChangeAddress(feeChange)),
          dispatch(setAddress(feeChange)),
        ]);
      }

      history.push({
        pathname: SEND_CONFIRMATION_ROUTE,
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackBtn = () => {
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };

  const handlePayFees = (assetHash: string) => {
    if (feeCurrency !== assetHash) {
      setUnsignedPendingTx('');
      setFeeCurrency(assetHash);
    }
  };

  const getFeeCurrencyImgPath = (): string => {
    let img: string = imgPathMapMainnet[feeCurrency || ''];
    if (network === 'regtest') {
      img = imgPathMapRegtest[assets[feeCurrency || '']?.ticker];
    }

    if (!img) {
      return imgPathMapMainnet[''];
    }

    return img;
  };

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance
        assetBalance={formatDecimalAmount(fromSatoshi(balances[feeCurrency || lbtcAssetHash] ?? 0))}
        assetImgPath={getFeeCurrencyImgPath()}
        assetHash={sendAsset}
        assetTicker={assets[feeCurrency || '']?.ticker ?? ''}
        className="mt-4"
      />
      <div className="w-48 mx-auto border-b-0.5 border-graySuperLight pt-2 mb-6" />

      <div>
        <p key={0} className="text-sm font-medium">
          I pay fee in:
        </p>
        <div key={1} className="flex flex-row justify-center gap-0.5 mx-auto w-11/12 mt-2">
          {[lbtcAssetHash, ...taxiAssets].map((assetHash) => (
            <Button
              className="flex-1"
              isOutline={feeCurrency !== assetHash}
              key={assetHash}
              onClick={() => handlePayFees(assetHash)}
              roundedMd={true}
              textBase={true}
              extraData={assetHash}
              disabled={loading}
            >
              {assets[assetHash]?.ticker || assetHash.slice(0, 4).toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {feeCurrency && unsignedPendingTx.length > 0 && (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">
              {!taxiAssets.includes(feeCurrency)
                ? `${fromSatoshiStr(feeAmountFromTx(unsignedPendingTx))} L-BTC`
                : `${fromSatoshiStr(topup?.assetAmount || 0)} USDt *`}
            </span>
          </div>
          {taxiAssets.includes(feeCurrency) && (
            <p className="text-primary mt-3.5 text-xs font-medium text-left">
              * Fee paid with Liquid taxi 🚕
            </p>
          )}
        </>
      )}
      {errorMessage && (
        <p className="text-red line-clamp-2 mt-3 text-xs text-left break-all">{errorMessage}</p>
      )}
      {loading && <div className="h-10 mx-auto" ref={circleLoaderRef} />}

      <Button
        className="bottom-20 right-8 absolute"
        onClick={handleConfirm}
        disabled={loading || feeCurrency === undefined || unsignedPendingTx === ''}
      >
        Confirm
      </Button>
    </ShellPopUp>
  );
};
export default ChooseFeeView;
