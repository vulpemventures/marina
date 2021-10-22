import {
  RESET,
  RESET_APP,
  RESET_CONNECT,
  RESET_TAXI,
  RESET_WALLET,
  START_DEEP_RESTORATION,
  START_PERIODIC_UPDATE,
  UPDATE_TAXI_ASSETS,
} from './actions/action-types';
import { createStore, applyMiddleware, Store, AnyAction } from 'redux';
import { alias, wrapStore } from 'webext-redux';
import marinaReducer from './reducers';
import persistStore from 'redux-persist/es/persistStore';
import { parse, stringify } from '../utils/browser-storage-converters';
import thunk, { ThunkAction } from 'redux-thunk';
import { RootReducerState } from '../../domain/common';
import { fetchAssetsFromTaxi, getStateRestorerOptsFromAddresses, taxiURL } from '../utils';
import { setTaxiAssets, updateTaxiAssets } from './actions/taxi';
import browser from 'webextension-polyfill';
import { IdentityType, masterPubKeyRestorerFromEsplora, MasterPublicKey } from 'ldk';
import { getExplorerURLSelector } from './selectors/app.selector';
import { setDeepRestorerError, setDeepRestorerIsLoading, setWalletData } from './actions/wallet';
import { createAddress } from '../../domain/address';
import { flushTx } from './actions/connect';
import { txsUpdateTask, utxosUpdateTask } from './actions/updater';
import { AccountID, MainAccountID, RestrictedAssetAccountID } from '../../domain/account';
import { extractErrorMessage } from '../../presentation/utils/error';

export const serializerAndDeserializer = {
  serializer: (payload: any) => stringify(payload),
  deserializer: (payload: any) => parse(payload),
};

const backgroundAliases = {
  [UPDATE_TAXI_ASSETS]: () => fetchAndSetTaxiAssets(),
  [START_PERIODIC_UPDATE]: () => startAlarmUpdater(),
  [START_DEEP_RESTORATION]: () => deepRestorer(),
  [RESET]: () => resetAll(),
};

const create = () => createStore(marinaReducer, applyMiddleware(alias(backgroundAliases), thunk));

// fetch assets from taxi daemon endpoint (make a grpc call)
// and then set assets in store.
function fetchAndSetTaxiAssets(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return async (dispatch, getState) => {
    try {
      const state = getState();
      const assets = await fetchAssetsFromTaxi(taxiURL[state.app.network]);

      const currentAssets = state.taxi.taxiAssets;
      const sortAndJoin = (a: string[]) => a.sort().join('');

      if (sortAndJoin(currentAssets) === sortAndJoin(assets)) {
        return; // skip if same assets state
      }

      dispatch(setTaxiAssets(assets));
    } catch (err) {
      console.error('an error happen while fetching taxi assets:', extractErrorMessage(err));
    }
  };
}

// Start the periodic updater (for utxos and txs fetching)
export function startAlarmUpdater(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return (dispatch) => {
    dispatch(utxosUpdateTask(MainAccountID));

    browser.alarms.onAlarm.addListener((alarm) => {
      switch (alarm.name) {
        case 'UPDATE_ALARM':
          ([MainAccountID, RestrictedAssetAccountID] as AccountID[]).forEach((ID: AccountID) => {
            dispatch(utxosUpdateTask(ID));
            dispatch(txsUpdateTask(ID));
          })
          
          dispatch(updateTaxiAssets());
          break;

        default:
          break;
      }
    });

    browser.alarms.create('UPDATE_ALARM', {
      when: Date.now(),
      periodInMinutes: 1,
    });
  };
}

// Using to generate addresses and use the explorer to test them
export function deepRestorer(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return async (dispatch, getState) => {
    const state = getState();
    const { isLoading, gapLimit } = state.wallet.deepRestorer;
    const toRestore = new MasterPublicKey({
      chain: state.app.network,
      type: IdentityType.MasterPublicKey,
      opts: {
        masterPublicKey: state.wallet.mainAccount.masterXPub,
        masterBlindingKey: state.wallet.mainAccount.masterBlindingKey,
      },
    });
    const explorer = getExplorerURLSelector(getState());
    if (isLoading) return;

    try {
      dispatch(setDeepRestorerIsLoading(true));
      const opts = { gapLimit, esploraURL: explorer };
      const publicKey = await masterPubKeyRestorerFromEsplora(toRestore)(opts);
      const addresses = (await publicKey.getAddresses()).map((a) =>
        createAddress(a.confidentialAddress, a.derivationPath)
      );

      const restorerOpts = getStateRestorerOptsFromAddresses(addresses);

      dispatch(
        setWalletData({
          ...state.wallet.mainAccount,
          restorerOpts,
          confidentialAddresses: addresses,
          passwordHash: state.wallet.passwordHash,
        })
      );

      dispatch(utxosUpdateTask(MainAccountID));
      dispatch(txsUpdateTask(MainAccountID));
      dispatch(fetchAndSetTaxiAssets());

      dispatch(setDeepRestorerError(undefined));
    } catch (err: any) {
      dispatch(setDeepRestorerError(err.message || err));
    } finally {
      dispatch(setDeepRestorerIsLoading(false));
    }
  };
}

// reset all the reducers except the `assets` reducer (shared data).
export function resetAll(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return (dispatch) => {
    dispatch({ type: RESET_TAXI });
    dispatch({ type: RESET_APP });
    dispatch({ type: RESET_WALLET });
    dispatch({ type: RESET_CONNECT });
    dispatch(flushTx());
  };
}

export const marinaStore = create();
export const persistor = persistStore(marinaStore);

export const wrapMarinaStore = (store: Store) => {
  wrapStore(store, serializerAndDeserializer);
};
