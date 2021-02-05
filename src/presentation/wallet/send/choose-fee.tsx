import React, { useContext, useEffect, useState } from 'react';
import cx from 'classnames';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_CONFIRMATION_ROUTE } from '../../routes/constants';
import { useHistory } from 'react-router';
import { AppContext } from '../../../application/store/context';
import { setPendingTx } from '../../../application/store/actions';
import {
  setFeeAssetAndAmount,
  setFeeChangeAddress,
} from '../../../application/store/actions/transaction';
import { Transaction } from '../../../domain/wallet/value-objects/transaction';

import {
  AddressInterface,
  fetchAndUnblindUtxos,
  address,
  MasterPublicKey,
  IdentityType,
  fromXpub,
  UtxoInterface,
  walletFromCoins,
  greedyCoinSelector,
  RecipientInterface,
  EsploraIdentityRestorer,
} from 'ldk';
import { IWallet } from '../../../domain/wallet/wallet';
import { Address } from '../../../domain/wallet/value-objects';
import { nextAddressForWallet } from '../../../application/utils/restorer';
import { browser } from 'webextension-polyfill-ts';
import { assetInfoByHash, assetInfoByTicker, feeAmountFromTx, fetchTopupFromTaxi, fillTaxiTx } from '../../utils';

const feeLevelToSatsPerByte: { [key: string]: number } = {
  '0': 0.1,
  '50': 0.1,
  '100': 0.1,
};

const taxiURL: Record<string, string> = {
  'regtest': 'http://localhost:8000',
  'mainnet': 'https://staging.api.liquid.taxi:8000',
}

const ChooseFee: React.FC = () => {
  const history = useHistory();
  const [{ wallets, app, transaction }, dispatch] = useContext(AppContext);
  const [feeCurrency, setFeeCurrency] = useState<string>('L-BTC');
  const [feeLevel, setFeeLevel] = useState<string>('50');
  const [taxiTopup, setTaxiTopup] = useState<any>(undefined);
  const [satsPerByte, setSatsPerByte] = useState<number>(0);
  const [unspents, setUnspents] = useState<UtxoInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unsignedPendingTx, setUnsignedPendingTx] = useState<string>('');
  const [isWarningFee] = useState<boolean>(true);
  const receipientAssetTicker = assetInfoByHash[transaction.asset].ticker;

  // TODO: remove this since utxos will be already cached in memory
  useEffect(() => {
    void (async (): Promise<void> => {
      if (isLoading) {
        try {
          const unspents = await fetchUtxos(wallets[0], app.network.value);
          setUnspents(unspents);
        } catch (error) {
          console.log(error);
        } finally {
          setIsLoading(false);
        }
      }
    })();
  });

  // This sets the fee change address in case fees are not of the same asset
  // type of the one to be sent to the receipient.
  useEffect(() => {
    void (async (): Promise<void> => {
      if (!isLoading) {
        if (
          feeCurrency !== receipientAssetTicker &&
          transaction.feeChangeAddress === ''
        ) {
          try {
            const wallet = { ...wallets[0] };
            wallet.confidentialAddresses.push(Address.create(transaction.changeAddress));
            const feeChangeAddress = await nextAddressForWallet(wallet, app.network.value, true);
            dispatch(setFeeChangeAddress(feeChangeAddress));
          } catch (error) {
            console.log(error);
          }
        }
      }
    })();
  }, [dispatch, wallets, isLoading, feeCurrency, transaction, unspents, app, feeLevel, satsPerByte]);

  useEffect(() => {
    void (async (): Promise<void> => {
      if (!isLoading) {
        if (feeCurrency === 'L-BTC') {
          // this check prevents to build a tx in case the fee change address isn't
          // yet available but needed for the tx.
          if (
            feeCurrency === receipientAssetTicker ||
            transaction.feeChangeAddress !== ''
          ) {
            try {
              const w = walletFromCoins(unspents, app.network.value);
              const receipients: RecipientInterface[] = [
                {
                  asset: transaction.asset,
                  value: transaction.amountInSatoshi,
                  address: transaction.receipientAddress,
                },
              ];
              const changeAddressGetter = (asset: string): any => {
                if (asset === transaction.asset) {
                  return transaction.changeAddress;
                }
                return transaction.feeChangeAddress;
              };

              const currentSatsPerByte = feeLevelToSatsPerByte[feeLevel];
              if (currentSatsPerByte !== satsPerByte) {
                const tx: string = w.buildTx(
                  w.createTx(),
                  receipients,
                  greedyCoinSelector(),
                  changeAddressGetter,
                  true,
                  satsPerByte
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
    })();
  },  [isLoading, feeCurrency, transaction, unspents, app, feeLevel, satsPerByte]);

  const handleConfirm = () => {
    const feeAsset = assetInfoByTicker[feeCurrency].hash;
    let feeAmount: number;
    if (feeCurrency === 'L-BTC') {
      feeAmount = parseFloat(feeAmountFromTx(unsignedPendingTx)) * Math.pow(10, 8);
    } else {
      feeAmount = taxiTopup.topup.assetAmount;
    }
    dispatch(
      setPendingTx(
        Transaction.create({
          value: unsignedPendingTx,
          sendAddress: transaction.receipientAddress,
          sendAsset: transaction.asset,
          sendAmount: transaction.amountInSatoshi,
          feeAsset: feeAsset,
          feeAmount: feeAmount,
        }),
        () => {
          dispatch(setFeeAssetAndAmount(feeAsset, feeAmount));
          history.push(SEND_CONFIRMATION_ROUTE);
          browser.browserAction.setBadgeText({ text: '1' }).catch((ignore) => ({}));
        },
        (err) => console.log(err)
      )
    );
  };

  const handleUseUSDtFees = async () => {
    const feeCurrency = 'USDt';
    setFeeCurrency(feeCurrency);
    
    try {
      const changeAddressGetter = (asset: string): any => {
        if (asset === transaction.asset) {
          return transaction.changeAddress;
        }
        return transaction.feeChangeAddress;
      };

      let t = taxiTopup;
      if (!t) {
        const feeAsset = assetInfoByTicker[feeCurrency].hash;
        const topup = await fetchTopupFromTaxi(taxiURL[app.network.value], feeAsset);
        setTaxiTopup(topup);
        t = topup;
      }
      const taxiPayout = {
        value: t.topup.assetAmount,
        asset: t.topup.assetHash,
        address: '',
      } as RecipientInterface;
      const receipients: RecipientInterface[] = [
        {
          asset: transaction.asset,
          value: transaction.amountInSatoshi,
          address: transaction.receipientAddress,
        },
      ];

      const tx = fillTaxiTx(
        t.topup.partial,
        unspents,
        receipients,
        taxiPayout,
        greedyCoinSelector(),
        changeAddressGetter,
      );

      setUnsignedPendingTx(tx);
    } catch (error) {
      console.log(error);
    }
  }

  const warningFee = (
    <div className="flex flex-row gap-2 mt-5">
      <img className="w-4 h-4" src="assets/images/marina-logo.svg" alt="warning" />
      <p className="font-regular text-xs text-left">
        9.99862 L-BTC will be sent in order to cover fee
      </p>
    </div>
  );

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance className="mt-4" liquidBitcoinBalance={0.005} fiatBalance={120} fiatCurrency="$" />

      <div className="w-48 mx-auto border-b-0.5 border-graySuperLight pt-2 mb-6"></div>

      <p className="text-sm font-medium">I pay fee in:</p>

      <div className="flex flex-row justify-center gap-0.5 mx-auto w-11/12 mt-2">
        <Button
          className="flex-1"
          isOutline={true}
          onClick={() => setFeeCurrency('L-BTC')}
          roundedMd={true}
          textBase={true}
        >
          L-BTC
        </Button>
        <Button
          className="flex-1"
          onClick={handleUseUSDtFees}
          roundedMd={true}
          textBase={true}
        >
          USDt
        </Button>
      </div>

      {feeCurrency === 'L-BTC' && (
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

      {feeCurrency === 'USDt' && (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">0.00138 USDt *</span>
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
        disabled={unsignedPendingTx === ''}
      >
        Confirm
      </Button>
    </ShellPopUp>
  );
};
export default ChooseFee;

const fetchUtxos = (wallet: IWallet, network: string): Promise<UtxoInterface[]> => {
  const pubKeyWallet = new MasterPublicKey({
    chain: network,
    type: IdentityType.MasterPublicKey,
    value: {
      masterPublicKey: fromXpub(wallet.masterXPub.value, network),
      masterBlindingKey: wallet.masterBlindingKey.value,
    },
    restorer: new EsploraIdentityRestorer('http://localhost:3001'),
    initializeFromRestorer: true,
  });
  const addresses: AddressInterface[] = wallet.confidentialAddresses.map((addr) => {
    const script = address.toOutputScript(addr.value);
    return {
      confidentialAddress: addr.value,
      blindingPrivateKey: pubKeyWallet.getBlindingPrivateKey(script.toString('hex')),
    };
  });

  return fetchAndUnblindUtxos(addresses, 'http://localhost:3001');
};
