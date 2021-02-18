import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import cx from 'classnames';
import { walletFromCoins, greedyCoinSelector, RecipientInterface } from 'ldk';
import { browser } from 'webextension-polyfill-ts';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_CONFIRMATION_ROUTE } from '../../routes/constants';
import { AppContext } from '../../../application/store/context';
import {
  getAllAssetBalances,
  setPendingTx,
  setFeeAssetAndAmount,
  setFeeChangeAddress,
  setTopup,
} from '../../../application/store/actions';
import { nextAddressForWallet } from '../../../application/utils/restorer';
import { Transaction } from '../../../domain/wallet/value-objects/transaction';
import { Address } from '../../../domain/wallet/value-objects';
import {
  feeAmountFromTx,
  fetchAssetsFromTaxi,
  fetchTopupFromTaxi,
  lbtcAssetByNetwork,
  fillTaxiTx,
  utxoMapToArray,
  formatAmount,
  feeLevelToSatsPerByte,
  taxiURL,
  imgPathMapRegtest,
  imgPathMapMainnet,
} from '../../utils';

const ChooseFee: React.FC = () => {
  const history = useHistory();
  const [{ app, assets, transaction, wallets }, dispatch] = useContext(AppContext);
  const [feeCurrency, setFeeCurrency] = useState<string>('');
  const [feeLevel, setFeeLevel] = useState<string>('');
  const [satsPerByte, setSatsPerByte] = useState<number>(0);
  const [unsignedPendingTx, setUnsignedPendingTx] = useState<string>('');
  const [supportedAssets, setSupportedAssets] = useState<string[]>([]);
  const [isWarningFee] = useState<boolean>(true);
  const unspents = utxoMapToArray(wallets[0].utxoMap);
  const [balances, setBalances] = useState<{ [assetHash: string]: number }>({});

  const changeAddressGetter = useCallback(
    (asset: string): string => {
      if (asset === transaction.asset) {
        return transaction.changeAddress;
      }
      return transaction.feeChangeAddress;
    },
    [transaction.asset, transaction.changeAddress, transaction.feeChangeAddress]
  );

  const receipients: RecipientInterface[] = useMemo(
    () => [
      {
        asset: transaction.asset,
        value: transaction.amountInSatoshi,
        address: transaction.receipientAddress,
      },
    ],
    [transaction.amountInSatoshi, transaction.asset, transaction.receipientAddress]
  );

  useEffect(() => {
    dispatch(
      getAllAssetBalances(
        (b) => setBalances(b),
        (error) => console.log(error)
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (supportedAssets.length <= 0) {
      void (async (): Promise<void> => {
        let allAssets: string[] = [lbtcAssetByNetwork(app.network.value)];
        try {
          const taxiAssets: string[] = await fetchAssetsFromTaxi(taxiURL[app.network.value]);
          allAssets = allAssets.concat(taxiAssets);
        } catch (error) {
          console.log(error);
        } finally {
          setSupportedAssets(allAssets);
          setFeeLevel('50');
        }
      })();
    }
  }, [app.network.value, supportedAssets.length]);

  // Set feeCurrency when balances and supportedAssets are ready (or change)
  useEffect(() => {
    if (Object.entries(balances).length === 0 || supportedAssets.length === 0) return;
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

  useEffect(() => {
    if (supportedAssets.length > 0) {
      void (async (): Promise<void> => {
        if (feeCurrency !== transaction.asset && transaction.feeChangeAddress === '') {
          try {
            const wallet = { ...wallets[0] };
            wallet.confidentialAddresses.push(Address.create(transaction.changeAddress));
            const feeChangeAddress = await nextAddressForWallet(wallet, app.network.value, true);
            dispatch(setFeeChangeAddress(feeChangeAddress));
          } catch (error) {
            console.log(error);
          }
        }
      })();
    }
  });

  useEffect(() => {
    if (supportedAssets.length > 0) {
      if (feeCurrency === transaction.asset || transaction.feeChangeAddress !== '') {
        if (feeCurrency === lbtcAssetByNetwork(app.network.value)) {
          // this check prevents to build a tx in case the fee change address isn't
          // yet available but needed for the tx.
          try {
            const w = walletFromCoins(unspents, app.network.value);

            const currentSatsPerByte = feeLevelToSatsPerByte[feeLevel];
            if (currentSatsPerByte !== satsPerByte) {
              const tx: string = w.buildTx(
                w.createTx(),
                receipients,
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
          }
        }
      }
    }
  }, [
    app.network.value,
    changeAddressGetter,
    feeCurrency,
    feeLevel,
    receipients,
    satsPerByte,
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
    void (async (): Promise<void> => {
      if (
        feeCurrency &&
        feeCurrency !== lbtcAssetByNetwork(app.network.value) &&
        Object.entries(transaction.taxiTopup).length === 0
      ) {
        try {
          const taxiTopup = await fetchTopupFromTaxi(taxiURL[app.network.value], feeCurrency);
          dispatch(setTopup(taxiTopup));
        } catch (error) {
          console.error(error.message);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.network.value, feeCurrency, transaction.taxiTopup]);

  // Fill Taxi tx
  useEffect(() => {
    if (
      !unsignedPendingTx &&
      Object.entries(transaction.taxiTopup).length !== 0 &&
      (feeCurrency === transaction.asset || transaction.feeChangeAddress !== '')
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
          receipients,
          taxiPayout,
          greedyCoinSelector(),
          changeAddressGetter
        );
        setUnsignedPendingTx(tx);
      } catch (error) {
        console.log(error);
      }
    }
  }, [
    changeAddressGetter,
    feeCurrency,
    receipients,
    transaction,
    transaction.taxiTopup,
    unsignedPendingTx,
    unspents,
  ]);

  const handleConfirm = () => {
    let feeAmount: number;
    if (feeCurrency === lbtcAssetByNetwork(app.network.value)) {
      feeAmount = parseFloat(feeAmountFromTx(unsignedPendingTx)) * Math.pow(10, 8);
    } else {
      feeAmount = transaction.taxiTopup?.topup?.assetAmount as number;
    }
    dispatch(
      setPendingTx(
        Transaction.create({
          value: unsignedPendingTx,
          sendAddress: transaction.receipientAddress,
          sendAsset: transaction.asset,
          sendAmount: transaction.amountInSatoshi,
          feeAsset: feeCurrency,
          feeAmount: feeAmount,
        }),
        () => {
          dispatch(setFeeAssetAndAmount(feeCurrency, feeAmount));
          history.push(SEND_CONFIRMATION_ROUTE);
          browser.browserAction.setBadgeText({ text: '1' }).catch((ignore) => ({}));
        },
        (err) => console.log(err)
      )
    );
  };

  const handlePayFees = (e: any, assetHash: string) => setFeeCurrency(assetHash);

  const warningFee = (
    <div className="flex flex-row gap-2 mt-5">
      <img className="w-4 h-4" src={'assets/images/marina-logo.svg'} alt="warning" />
      <p className="font-regular text-xs text-left">
        9.99862 L-BTC will be sent in order to cover fee
      </p>
    </div>
  );

  // Choose Fee buttons
  const chooseFeeLbtcButton = (
    <Button
      className="flex-1"
      isOutline={feeCurrency === lbtcAssetByNetwork(app.network.value)}
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
      isOutline={feeCurrency !== lbtcAssetByNetwork(app.network.value)}
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

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance
        assetBalance={(balances[feeCurrency] ?? 0) / Math.pow(10, 8)}
        assetImgPath={
          app.network.value === 'regtest'
            ? imgPathMapRegtest[assets[app.network.value][feeCurrency]?.ticker] ??
              imgPathMapRegtest['']
            : imgPathMapMainnet[feeCurrency] ?? imgPathMapMainnet['']
        }
        assetTicker={assets[app.network.value][feeCurrency]?.ticker ?? ''}
        className="mt-4"
        fiatBalance={120}
        fiatCurrency="$"
      />

      <div className="w-48 mx-auto border-b-0.5 border-graySuperLight pt-2 mb-6" />

      {supportedAssets.length <= 0 ? (
        <div>Loading...</div>
      ) : (
        [
          <p key={0} className="text-sm font-medium">
            I pay fee in:
          </p>,
          <div key={1} className="flex flex-row justify-center gap-0.5 mx-auto w-11/12 mt-2">
            {chooseFeeButtons}
          </div>,
        ]
      )}

      {feeCurrency && feeCurrency === lbtcAssetByNetwork(app.network.value) && (
        <div
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
          <p className="text-gray mt-5 text-xs font-medium text-left">
            {unsignedPendingTx ? `${feeAmountFromTx(unsignedPendingTx)} L-BTC` : 'Loading...'}
          </p>
          {isWarningFee && warningFee}
        </div>
      )}

      {feeCurrency && feeCurrency !== lbtcAssetByNetwork(app.network.value) && (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">
              {transaction.taxiTopup?.topup
                ? `${formatAmount(transaction.taxiTopup.topup.assetAmount)} USDt *`
                : 'Loading...'}
            </span>
          </div>
          {isWarningFee && warningFee}
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
export default ChooseFee;
