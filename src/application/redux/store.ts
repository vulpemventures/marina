import {
  RESET,
  RESET_APP,
  RESET_CONNECT,
  RESET_TAXI,
  RESET_WALLET,
  START_DEEP_RESTORATION,
} from './actions/action-types';
import { createStore, applyMiddleware, Store, AnyAction } from 'redux';
import { alias, wrapStore } from 'webext-redux';
import marinaReducer from './reducers';
import persistStore from 'redux-persist/es/persistStore';
import { parse, stringify } from '../utils/browser-storage-converters';
import { RootReducerState } from '../../domain/common';
import { getStateRestorerOptsFromAddresses } from '../utils';
import { IdentityType, masterPubKeyRestorerFromEsplora, MasterPublicKey } from 'ldk';
import { getExplorerURLSelector } from './selectors/app.selector';
import { setDeepRestorerError, setDeepRestorerIsLoading, setWalletData } from './actions/wallet';
import { createAddress } from '../../domain/address';
import createSagaMiddleware from 'redux-saga';
import mainSaga from './sagas/main';

export const serializerAndDeserializer = {
  serializer: (payload: any) => stringify(payload),
  deserializer: (payload: any) => parse(payload),
};

const backgroundAliases = {
  [START_DEEP_RESTORATION]: () => deepRestorer(),
};

const sagaMiddleware = createSagaMiddleware();
const create = () => createStore(marinaReducer, applyMiddleware(alias(backgroundAliases), sagaMiddleware));

sagaMiddleware.run(mainSaga);

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

      dispatch(updateTaskAction)
      dispatch(fetchAndSetTaxiAssets());

      dispatch(setDeepRestorerError(undefined));
    } catch (err: any) {
      dispatch(setDeepRestorerError(err.message || err));
    } finally {
      dispatch(setDeepRestorerIsLoading(false));
    }
  };
}