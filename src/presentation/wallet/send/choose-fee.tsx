import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { greedyCoinSelector, RecipientInterface, walletFromCoins } from 'ldk';
import { browser } from 'webextension-polyfill-ts';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_ADDRESS_AMOUNT_ROUTE, SEND_CONFIRMATION_ROUTE } from '../../routes/constants';
import {
  feeAmountFromTx,
  feeLevelToSatsPerByte,
  fetchAssetsFromTaxi,
  fetchTopupFromTaxi,
  fillTaxiTx,
  imgPathMapMainnet,
  imgPathMapRegtest,
  lbtcAssetByNetwork,
  nextAddressForWallet,
  taxiURL,
  usdtAssetHash,
} from '../../../application/utils';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../../utils';
import useLottieLoader from '../../hooks/use-lottie-loader';
import { IWallet } from '../../../domain/wallet';
import { AssetsByNetwork } from '../../../domain/assets';
import { TransactionState } from '../../../application/redux/reducers/transaction-reducer';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../..';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import {
  setFeeAssetAndAmount,
  setFeeChangeAddress,
  setTopup,
} from '../../../application/redux/actions/transaction';
import { setPendingTx } from '../../../application/redux/actions/wallet';
import { Network } from '../../../domain/network';
import { Address, createAddress } from '../../../domain/address';
import { createTransaction } from '../../../domain/transaction';

interface LocationState {
  changeAddress: Address;
}

export interface ChooseFeeProps {
  network: Network;
  assets: AssetsByNetwork;
  transaction: TransactionState;
  wallet: IWallet;
  balances: BalancesByAsset;
}

const ChooseFeeView: React.FC<ChooseFeeProps> = ({
  network,
  assets,
  transaction,
  wallet,
  balances,
}) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const { state } = useLocation<LocationState>();

  const [feeCurrency, setFeeCurrency] = useState<string>('');
  const [feeLevel, setFeeLevel] = useState<string>('');
  const [satsPerByte, setSatsPerByte] = useState<number>(0);
  const [unsignedPendingTx, setUnsignedPendingTx] = useState<string>('');
  const [supportedAssets, setSupportedAssets] = useState<string[]>([]);
  const unspents = Object.values(wallet.utxoMap);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate ref div with svg animations
  const mermaidLoaderRef = React.useRef(null);
  const circleLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');
  useLottieLoader(circleLoaderRef, '/assets/animations/circle-loader.json');

  const changeAddressGetter = useCallback(
    (asset: string): string => {
      if (asset === transaction.asset) {
        return transaction.changeAddress.value;
      }
      return transaction.feeChangeAddress.value;
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

  useEffect(() => {
    if (supportedAssets.length <= 0) {
      void (async (): Promise<void> => {
        let allAssets: string[] = [lbtcAssetByNetwork(network)];
        try {
          const taxiAssets: string[] = await fetchAssetsFromTaxi(taxiURL[network]);
          allAssets = allAssets.concat(taxiAssets);
        } catch (error) {
          let msg = error.message;
          if (error.code === 2) {
            msg = 'Taxi is not available';
          }
          setErrorMessage(msg);
        } finally {
          setSupportedAssets(allAssets);
          setFeeLevel('50');
        }
      })();
    }
  }, [network, supportedAssets.length]);

  // Set feeCurrency when balances and supportedAssets are ready (or change)
  useEffect(() => {
    if (Object.keys(balances).length === 0 || supportedAssets.length === 0) return;
    // L-BTC if positive L-BTC balance only
    if (!!balances[supportedAssets[0]] && !balances[supportedAssets[1]]) {
      setFeeCurrency(supportedAssets[0]);
    }
    // USDt if positive USDt balance only
    else if (!balances[supportedAssets[0]] && !!balances[supportedAssets[1]]) {
      setFeeCurrency(supportedAssets[1]);
    } else {
      setFeeCurrency(supportedAssets[0]);
    }
  }, [balances, supportedAssets]);

  /**
   * Set fee change address
   */
  useEffect(() => {
    if (supportedAssets.length > 0) {
      void (async () => {
        if (feeCurrency !== transaction.asset && transaction.feeChangeAddress === undefined) {
          try {
            const feeChangeAddress = await nextAddressForWallet(wallet, network, true);
            await dispatch(
              setFeeChangeAddress(
                createAddress(feeChangeAddress.value, feeChangeAddress.derivationPath)
              )
            );
          } catch (error) {
            console.log(error);
            setErrorMessage(error.message);
          }
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    network,
    feeCurrency,
    supportedAssets.length,
    transaction.asset,
    transaction.feeChangeAddress,
    wallet,
  ]);

  // Build regular tx (no taxi)
  useEffect(() => {
    if (supportedAssets.length > 0) {
      if (
        feeCurrency === transaction.asset ||
        (transaction.feeChangeAddress && transaction.feeChangeAddress.value !== '')
      ) {
        if (feeCurrency === lbtcAssetByNetwork(network)) {
          // this check prevents to build a tx in case the fee change address isn't
          // yet available but needed for the tx.
          try {
            const w = walletFromCoins(unspents, network);

            const currentSatsPerByte = feeLevelToSatsPerByte[feeLevel];
            if (currentSatsPerByte !== satsPerByte) {
              const tx: string = w.buildTx(
                w.createTx(),
                recipients,
                greedyCoinSelector(),
                changeAddressGetter,
                true,
                currentSatsPerByte
              );
              setUnsignedPendingTx(tx);
              setSatsPerByte(currentSatsPerByte);
            }
          } catch (error) {
            console.log(error);
            setErrorMessage(error.message);
          }
        }
      }
    }
  }, [
    network,
    changeAddressGetter,
    feeCurrency,
    feeLevel,
    recipients,
    satsPerByte,
    supportedAssets,
    supportedAssets.length,
    transaction.amountInSatoshi,
    transaction.asset,
    transaction.changeAddress,
    transaction.feeChangeAddress,
    transaction.receipientAddress,
    unspents,
  ]);

  // Fetch topup utxo from Taxi
  useEffect(() => {
    void (async () => {
      if (
        feeCurrency &&
        feeCurrency !== lbtcAssetByNetwork(network) &&
        Object.keys(transaction.taxiTopup).length === 0
      ) {
        try {
          const taxiTopup = await fetchTopupFromTaxi(taxiURL[network], feeCurrency);
          await dispatch(setTopup(taxiTopup));
        } catch (error) {
          console.error(error.message);
          setErrorMessage(error.message);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, feeCurrency, transaction.taxiTopup]);

  // Fill Taxi tx
  useEffect(() => {
    if (
      Object.keys(transaction.taxiTopup).length !== 0 &&
      feeCurrency === usdtAssetHash(assets[network])
    ) {
      const taxiPayout = {
        value: transaction.taxiTopup.topup?.assetAmount,
        asset: transaction.taxiTopup.topup?.assetHash,
        address: '',
      } as RecipientInterface;
      try {
        const tx: string = fillTaxiTx(
          transaction.taxiTopup.topup?.partial as string,
          unspents,
          recipients,
          taxiPayout,
          greedyCoinSelector(),
          changeAddressGetter
        );
        setUnsignedPendingTx(tx);
      } catch (error) {
        console.log(error);
        setErrorMessage(error.message);
      }
    }
  }, [
    network,
    assets,
    changeAddressGetter,
    feeCurrency,
    recipients,
    transaction.asset,
    transaction.feeChangeAddress,
    transaction.taxiTopup,
    unspents,
  ]);

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

  const handlePayFees = (e: any, assetHash: string) => {
    if (feeCurrency !== assetHash) {
      setFeeCurrency(assetHash);
      setUnsignedPendingTx('');
      setSatsPerByte(0);
      setTopup({});
    }
  };

  // Choose Fee buttons
  const chooseFeeLbtcButton = (
    <Button
      className="flex-1"
      isOutline={feeCurrency !== lbtcAssetByNetwork(network)}
      key={1}
      onClick={handlePayFees}
      roundedMd={true}
      textBase={true}
      extraData={supportedAssets[0]}
    >
      L-BTC
    </Button>
  );
  const chooseFeeUsdtButton = (
    <Button
      className="flex-1"
      isOutline={feeCurrency === lbtcAssetByNetwork(network)}
      key={2}
      onClick={handlePayFees}
      roundedMd={true}
      textBase={true}
      extraData={supportedAssets[1]}
    >
      USDt
    </Button>
  );
  let chooseFeeButtons;
  // Show only L-BTC if positive L-BTC balance only
  if (!!balances[supportedAssets[0]] && !balances[supportedAssets[1]]) {
    chooseFeeButtons = chooseFeeLbtcButton;
  }
  // Show only USDt if positive USDt balance only
  if (!balances[supportedAssets[0]] && !!balances[supportedAssets[1]]) {
    chooseFeeButtons = chooseFeeUsdtButton;
  }
  // Show L-BTC and USDt if both have positive balances
  if (!!balances[supportedAssets[0]] && !!balances[supportedAssets[1]]) {
    chooseFeeButtons = [chooseFeeLbtcButton, chooseFeeUsdtButton];
  }

  if (supportedAssets.length <= 0) {
    return <div className="flex items-center justify-center h-screen p-8" ref={mermaidLoaderRef} />;
  }

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
            ? imgPathMapRegtest[assets[network][feeCurrency]?.ticker] ?? imgPathMapRegtest['']
            : imgPathMapMainnet[feeCurrency] ?? imgPathMapMainnet['']
        }
        assetHash={transaction.asset}
        assetTicker={assets[network][feeCurrency]?.ticker ?? ''}
        className="mt-4"
        fiatBalance={120}
        fiatCurrency="$"
      />
      <div className="w-48 mx-auto border-b-0.5 border-graySuperLight pt-2 mb-6" />

      <div>
        <p key={0} className="text-sm font-medium">
          I pay fee in:
        </p>
        <div key={1} className="flex flex-row justify-center gap-0.5 mx-auto w-11/12 mt-2">
          {chooseFeeButtons}
        </div>
      </div>

      {feeCurrency && feeCurrency === lbtcAssetByNetwork(network) && (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">
              {unsignedPendingTx ? (
                `${fromSatoshiStr(feeAmountFromTx(unsignedPendingTx))} L-BTC`
              ) : errorMessage.length ? (
                <p className="text-red line-clamp-2 text-xs text-left break-all">{errorMessage}</p>
              ) : (
                <div className="h-10 mx-auto" ref={circleLoaderRef} />
              )}
            </span>
          </div>
          {/* <div
          className={cx({
            'track-50': feeLevel === '50',
            'track-100': feeLevel === '100',
          })}
        >
          <div className="text-primary flex flex-row justify-between mt-12 text-sm antialiased font-bold">
            <span>Slow</span>
            <span>Average</span>
            <span>Fast</span>
          </div>
          <input
            className="bg-graySuperLight focus:outline-none w-11/12"
            min="0"
            max="100"
            onChange={(event) => setFeeLevel(event.target.value)}
            step="50"
            type="range"
          />
          <div className="text-gray mt-1 text-xs font-medium text-center">
            {unsignedPendingTx ? (
              <span className="mt-3">{`Fee: ${fromSatoshiStr(feeAmountFromTx(unsignedPendingTx))} L-BTC`}</span>
            ) : errorMessage.length ? (
              <p className="text-red line-clamp-2 text-xs text-left break-all">{errorMessage}</p>
            ) : (
              <div className="h-10 mx-auto" ref={circleLoaderRef} />
            )}
          </div>
          {isWarningFee && warningFee}
        </div> */}
        </>
      )}
      {feeCurrency && feeCurrency !== lbtcAssetByNetwork(network) && (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">
              {transaction.taxiTopup?.topup ? (
                `${fromSatoshiStr(transaction.taxiTopup.topup.assetAmount)} USDt *`
              ) : errorMessage.length ? (
                <p className="text-red line-clamp-2 text-xs text-left break-all">{errorMessage}</p>
              ) : (
                <div className="h-10 mx-auto" ref={circleLoaderRef} />
              )}
            </span>
          </div>
          <p className="text-primary mt-3.5 text-xs font-medium text-left">
            * Fee paid with Liquid taxi 🚕
          </p>
        </>
      )}
      <Button
        className="bottom-20 right-8 absolute"
        onClick={handleConfirm}
        disabled={supportedAssets.length <= 0 || unsignedPendingTx === ''}
      >
        Confirm
      </Button>
    </ShellPopUp>
  );
};
export default ChooseFeeView;
