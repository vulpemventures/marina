import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import {
  ChangeAddressFromAssetGetter,
  greedyCoinSelector,
  RecipientInterface,
  walletFromCoins,
} from 'ldk';
import { browser } from 'webextension-polyfill-ts';
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
  nextAddressForWallet,
  taxiURL,
} from '../../../application/utils';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../../utils';
import useLottieLoader from '../../hooks/use-lottie-loader';
import { IWallet } from '../../../domain/wallet';
import { IAssets } from '../../../domain/assets';
import { TransactionState } from '../../../application/redux/reducers/transaction-reducer';
import { useDispatch } from 'react-redux';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import {
  setFeeAssetAndAmount,
  setFeeChangeAddress,
  setTopup,
} from '../../../application/redux/actions/transaction';
import { setAddress, setPendingTx } from '../../../application/redux/actions/wallet';
import { Network } from '../../../domain/network';
import { Address } from '../../../domain/address';
import { createTransaction } from '../../../domain/transaction';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';

interface LocationState {
  changeAddress: Address;
}

export interface ChooseFeeProps {
  network: Network;
  assets: IAssets;
  transaction: TransactionState;
  wallet: IWallet;
  balances: BalancesByAsset;
  taxiAssets: string[];
  lbtcAssetHash: string;
}

const ChooseFeeView: React.FC<ChooseFeeProps> = ({
  network,
  assets,
  transaction,
  wallet,
  balances,
  taxiAssets,
  lbtcAssetHash,
}) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const { state } = useLocation<LocationState>();

  const [feeCurrency, setFeeCurrency] = useState<string>(lbtcAssetHash);
  const [feeLevel] = useState<string>('50');
  const [unsignedPendingTx, setUnsignedPendingTx] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  // Populate ref div with svg animations
  const mermaidLoaderRef = React.useRef(null);
  const circleLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');
  useLottieLoader(circleLoaderRef, '/assets/animations/circle-loader.json');

  const changeAddressGetter: ChangeAddressFromAssetGetter = useCallback(
    (asset: string) => {
      if (asset === transaction.asset) {
        return transaction.changeAddress?.value;
      }
      return transaction.feeChangeAddress?.value;
    },
    [transaction.asset, transaction.changeAddress, transaction.feeChangeAddress]
  );

  const recipients: RecipientInterface[] = useMemo(
    () => [
      {
        asset: transaction.asset,
        value: transaction.amountInSatoshi,
        address: transaction.receipientAddress?.value ?? '',
      },
    ],
    [transaction.amountInSatoshi, transaction.asset, transaction.receipientAddress]
  );

  // Build regular tx (no taxi)
  useEffect(() => {
    (async () => {
      if (feeCurrency !== transaction.asset && transaction.feeChangeAddress === undefined) {
        // make sure we have the change fee address
        try {
          const feeChangeAddress = await nextAddressForWallet(wallet, network, true);
          await dispatch(setFeeChangeAddress(feeChangeAddress));
          await dispatch(setAddress(feeChangeAddress));
        } catch (error) {
          console.log(error);
          setErrorMessage(error.message);
        }
      }

      if (feeCurrency === lbtcAssetByNetwork(network)) {
        // no taxi
        const w = walletFromCoins(Object.values(wallet.utxoMap), network);
        const currentSatsPerByte = feeLevelToSatsPerByte[feeLevel];
        const tx: string = w.buildTx(
          w.createTx(),
          recipients,
          greedyCoinSelector(),
          changeAddressGetter,
          true,
          currentSatsPerByte
        );
        setUnsignedPendingTx(tx);

        return;
      }

      if (taxiAssets.includes(feeCurrency)) {
        // taxi
        const taxiTopup = await fetchTopupFromTaxi(taxiURL[network], feeCurrency);
        await dispatch(setTopup(taxiTopup));
        if (taxiTopup.topup === undefined) {
          throw new Error('Taxi topup is undefined');
        }
        const taxiPayout: RecipientInterface = {
          value: taxiTopup.topup?.assetAmount,
          asset: taxiTopup.topup?.assetHash,
          address: '',
        };

        const tx: string = fillTaxiTx(
          taxiTopup.topup.partial as string,
          Object.values(wallet.utxoMap),
          recipients,
          taxiPayout,
          greedyCoinSelector(),
          changeAddressGetter
        );

        setUnsignedPendingTx(tx);
        return;
      }
    })().catch((err) => setErrorMessage(err));
  }, [feeCurrency]);

  const handleConfirm = async () => {
    let feeAmount: number;
    if (feeCurrency === lbtcAssetByNetwork(network)) {
      feeAmount = feeAmountFromTx(unsignedPendingTx);
    } else {
      feeAmount = transaction.taxiTopup?.topup?.assetAmount as number;
    }

    // If user empty asset balance we don't set the change address
    const totalSats = feeAmount + transaction.amountInSatoshi;
    const balanceAsset = balances[transaction.asset];

    const tx = createTransaction({
      pset: unsignedPendingTx,
      sendAddress: transaction.receipientAddress?.value ?? '',
      sendAsset: transaction.asset,
      sendAmount: transaction.amountInSatoshi,
      feeAsset: feeCurrency,
      feeAmount: feeAmount,
      changeAddress: totalSats === balanceAsset ? undefined : state.changeAddress,
    });

    try {
      await dispatch(setPendingTx(tx));
      await dispatch(setFeeAssetAndAmount(feeCurrency, feeAmount));
      browser.browserAction.setBadgeText({ text: '1' }).catch((ignore) => ({}));
      history.push({
        pathname: SEND_CONFIRMATION_ROUTE,
        state: { changeAddress: state.changeAddress },
      });
    } catch (error) {
      console.log(error);
      setErrorMessage(error.message);
    }
  };

  const handleBackBtn = () => {
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };

  const handlePayFees = (assetHash: string) => {
    if (feeCurrency !== assetHash) {
      setFeeCurrency(assetHash);
      setUnsignedPendingTx('');
    }
  };

  // Choose Fee buttons
  const feeButton = (assetHash: string) => (
    <Button
      className="flex-1"
      isOutline={feeCurrency.valueOf() === assetHash.valueOf()}
      key={assetHash}
      onClick={() => handlePayFees(assetHash)}
      roundedMd={true}
      textBase={true}
      extraData={assetHash}
    >
      {assets[assetHash]?.ticker || assetHash.slice(0, 4).toUpperCase()}
    </Button>
  );

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance
        assetBalance={formatDecimalAmount(fromSatoshi(balances[feeCurrency] ?? 0))}
        assetImgPath={
          network === 'regtest'
            ? imgPathMapRegtest[assets[feeCurrency]?.ticker] ?? imgPathMapRegtest['']
            : imgPathMapMainnet[feeCurrency] ?? imgPathMapMainnet['']
        }
        assetHash={transaction.asset}
        assetTicker={assets[feeCurrency]?.ticker ?? ''}
        className="mt-4"
      />
      <div className="w-48 mx-auto border-b-0.5 border-graySuperLight pt-2 mb-6" />

      <div>
        <p key={0} className="text-sm font-medium">
          I pay fee in:
        </p>
        <div key={1} className="flex flex-row justify-center gap-0.5 mx-auto w-11/12 mt-2">
          {[feeButton(lbtcAssetHash)].push(...taxiAssets.map(feeButton))}
        </div>
      </div>

      {feeCurrency && unsignedPendingTx ? (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">
              {!taxiAssets.includes(feeCurrency)
                ? `${fromSatoshiStr(feeAmountFromTx(unsignedPendingTx))} L-BTC`
                : `${fromSatoshiStr(transaction?.taxiTopup.topup?.assetAmount || 0)} USDt *`}
            </span>
            {errorMessage.length && (
              <p className="text-red line-clamp-2 text-xs text-left break-all">{errorMessage}</p>
            )}
          </div>
          {taxiAssets.includes(feeCurrency) && (
            <p className="text-primary mt-3.5 text-xs font-medium text-left">
              * Fee paid with Liquid taxi 🚕
            </p>
          )}
        </>
      ) : (
        <div className="h-10 mx-auto" ref={circleLoaderRef} />
      )}

      <Button
        className="bottom-20 right-8 absolute"
        onClick={handleConfirm}
        disabled={feeCurrency === undefined || unsignedPendingTx === ''}
      >
        Confirm
      </Button>
    </ShellPopUp>
  );
};
export default ChooseFeeView;
