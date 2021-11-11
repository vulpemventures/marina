import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import {
  ChangeAddressFromAssetGetter,
  CoinSelectionResult,
  CoinSelector,
  greedyCoinSelector,
  RecipientInterface,
  UtxoInterface,
  walletFromCoins,
} from 'ldk';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_ADDRESS_AMOUNT_ROUTE, SEND_CONFIRMATION_ROUTE } from '../../routes/constants';
import {
  feeAmountFromTx,
  fetchTopupFromTaxi,
  createTaxiTxFromTopup,
  imgPathMapMainnet,
  imgPathMapRegtest,
  taxiURL,
} from '../../../application/utils';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../../utils';
import useLottieLoader from '../../hooks/use-lottie-loader';
import { IAssets } from '../../../domain/assets';
import { useDispatch } from 'react-redux';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import {
  setFeeAssetAndAmount,
  setFeeChangeAddress,
  setPset,
} from '../../../application/redux/actions/transaction';
import { Network } from '../../../domain/network';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { Address, createAddress } from '../../../domain/address';
import { Topup } from 'taxi-protobuf/generated/js/taxi_pb';
import { incrementChangeAddressIndex } from '../../../application/redux/actions/wallet';
import { Account, AccountID } from '../../../domain/account';
import { extractErrorMessage } from '../../utils/error';
import { AnyAction } from 'redux';

export interface ChooseFeeProps {
  network: Network;
  assets: IAssets;
  changeAddress?: Address;
  sendAmount: number;
  sendAddress?: Address;
  sendAsset: string;
  balances: BalancesByAsset;
  taxiAssets: string[];
  lbtcAssetHash: string;
  account: Account;
  utxos: UtxoInterface[];
}

interface State {
  unsignedPset?: string;
  utxos?: UtxoInterface[];
  feeChange?: Address;
  topup?: Topup.AsObject;
}

const initialState: State = {};

const ChooseFeeView: React.FC<ChooseFeeProps> = ({
  network,
  assets,
  changeAddress,
  sendAmount,
  sendAddress,
  sendAsset,
  balances,
  taxiAssets,
  lbtcAssetHash,
  account,
  utxos,
}) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const [state, setState] = useState(initialState);
  const [feeAsset, setFeeAsset] = useState<string | undefined>(lbtcAssetHash);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const circleLoaderRef = React.useRef(null);
  useLottieLoader(circleLoaderRef, '/assets/animations/circle-loader.json');

  const handleError = (err: unknown) => {
    console.error(err);
    setError(extractErrorMessage(err));
    setState(initialState);
    setFeeAsset(undefined);
  };

  const getRecipient = () => ({
    asset: sendAsset,
    value: sendAmount,
    address: sendAddress!.value,
  });

  const isTaxi = () => feeAsset !== lbtcAssetHash;

  // create the pset each time the user select a different fee currency
  useEffect(() => {
    if (!sendAddress || !changeAddress) {
      history.goBack(); // should be set in previous step
    }

    if (loading) return;
    if (!feeAsset) return;
    setLoading(true);
    setError(undefined);
    const done = () => setLoading(false);

    const newStatePromise = isTaxi()
      ? stateForTaxiPSET(
          account,
          feeAsset,
          getRecipient(),
          changeAddress!,
          utxos,
          network,
          state.topup
        )
      : stateForRegularPSET(getRecipient(), changeAddress!, utxos, network);

    newStatePromise.then(setState).catch(handleError).finally(done);
  }, [feeAsset]);

  // dispatch a set of actions in order to save the pset in redux state
  const handleConfirm = async () => {
    try {
      if (!feeAsset) throw new Error('fee asset not selected');
      setLoading(true);
      await Promise.all(actionsFromState(state, feeAsset, account.getAccountID()).map(dispatch));
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

  const handlePayFees = (assetHash: string) => {
    if (feeAsset !== assetHash) {
      setFeeAsset(assetHash);
    }
  };

  const getFeeCurrencyImgPath = (): string => {
    let img: string = imgPathMapMainnet[feeAsset || ''];
    if (network === 'regtest') {
      img = imgPathMapRegtest[assets[feeAsset || '']?.ticker];
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
        assetBalance={formatDecimalAmount(fromSatoshi(balances[feeAsset || lbtcAssetHash] ?? 0))}
        assetImgPath={getFeeCurrencyImgPath()}
        assetHash={sendAsset}
        assetTicker={assets[feeAsset || '']?.ticker ?? ''}
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
              isOutline={feeAsset !== assetHash}
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

      {feeAsset && state.unsignedPset && (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">
              {!isTaxi()
                ? `${fromSatoshiStr(feeAmountFromTx(state.unsignedPset))} L-BTC`
                : `${fromSatoshiStr(state.topup?.assetAmount || 0)} USDt *`}
            </span>
          </div>
          {taxiAssets.includes(feeAsset) && (
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
        disabled={loading || feeAsset === undefined || state === initialState}
      >
        Confirm
      </Button>
    </ShellPopUp>
  );
};

const sideEffectCoinSelector = (sideEffect: (r: CoinSelectionResult) => void): CoinSelector => {
  return (
    unspents: UtxoInterface[],
    outputs: RecipientInterface[],
    changeGetter: ChangeAddressFromAssetGetter
  ) => {
    const result = greedyCoinSelector()(unspents, outputs, changeGetter);
    sideEffect(result);
    return result;
  };
};

function stateForRegularPSET(
  recipient: RecipientInterface,
  change: Address,
  utxos: UtxoInterface[],
  network: Network
): Promise<State> {
  const result: State = {};
  result.unsignedPset = undefined;
  result.feeChange = undefined;
  result.utxos = [];
  const w = walletFromCoins(utxos, network);

  result.unsignedPset = w.buildTx(
    w.createTx(),
    [recipient],
    sideEffectCoinSelector(({ selectedUtxos }) => result.utxos?.push(...selectedUtxos)),
    () => change.value,
    true,
    0.1
  );

  result.topup = undefined;
  return Promise.resolve(result);
}

async function stateForTaxiPSET(
  account: Account,
  feeAsset: string,
  recipient: RecipientInterface,
  change: Address,
  utxos: UtxoInterface[],
  network: Network,
  lastTopup?: Topup.AsObject
): Promise<State> {
  const result: State = {};
  result.unsignedPset = undefined;
  result.topup = lastTopup;
  result.utxos = [];

  if (!lastTopup || feeAsset !== lastTopup.assetHash) {
    result.topup = undefined;
    result.topup = (await fetchTopupFromTaxi(taxiURL[network], feeAsset)).topup;
  }

  if (!result.topup) {
    throw new Error('Taxi topup should be defined for Taxi PSET');
  }

  const restored = await account.getWatchIdentity();
  const next = await restored.getNextChangeAddress();
  const feeChange = createAddress(next.confidentialAddress, next.derivationPath);

  const changeGetter = (asset: string) => {
    if (asset === recipient.asset) {
      return change.value;
    }

    result.feeChange = feeChange;
    return feeChange.value;
  };

  result.unsignedPset = createTaxiTxFromTopup(
    result.topup,
    utxos,
    [recipient],
    sideEffectCoinSelector(({ selectedUtxos }) => result.utxos?.push(...selectedUtxos)),
    changeGetter
  );

  return result;
}

function actionsFromState(state: State, feeCurrency: string, accountID: AccountID): AnyAction[] {
  if (!state.unsignedPset || !state.utxos) return [];

  const actions: AnyAction[] = [];
  const feeAmount = state.topup ? state.topup.assetAmount : feeAmountFromTx(state.unsignedPset);
  actions.push(setPset(state.unsignedPset, state.utxos));
  actions.push(setFeeAssetAndAmount(feeCurrency, feeAmount));

  if (state.feeChange) {
    actions.push(setFeeChangeAddress(state.feeChange));
    actions.push(incrementChangeAddressIndex(accountID));
  }

  return actions;
}

export default ChooseFeeView;
