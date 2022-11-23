import type { NetworkString } from 'ldk';
import type { AccountID } from 'marina-provider';
import type { RootReducerState } from '../domain/common';
import type { Store } from 'redux';
import {
  popRestorerLoader,
  pushRestorerLoader,
  setDeepRestorerError,
  setRestorerOpts,
} from '../application/redux/actions/wallet';
import { selectChainAPI } from '../application/redux/selectors/app.selector';
import {
  selectAccount,
  selectDeepRestorerGapLimit,
} from '../application/redux/selectors/wallet.selector';
import { getStateRestorerOptsFromAddresses } from '../application/utils/restorer';
import { isMnemonicAccount } from '../domain/account';
import { extractErrorMessage } from '../presentation/utils/error';

async function restoreAccount(
  store: Store<RootReducerState>,
  accountID: AccountID,
  network: NetworkString
): Promise<void> {
  const state = store.getState();
  const account = selectAccount(accountID)(state);
  if (!account) throw new Error('Account not found');
  if (!isMnemonicAccount(account)) return; // only mnemonic accounts can be restored
  store.dispatch(pushRestorerLoader());

  try {
    const api = selectChainAPI(network)(state);
    const gapLimit = selectDeepRestorerGapLimit(state);
    const deepRestorer = account.getDeepRestorer(network);
    const restored = await deepRestorer({ api, gapLimit });
    const addresses = await restored.getAddresses();
    const stateRestorerOpts = getStateRestorerOptsFromAddresses(addresses);
    store.dispatch(setRestorerOpts(accountID, stateRestorerOpts, network));
  } catch (error) {
    store.dispatch(
      setDeepRestorerError(new Error(`deep restore error: ${extractErrorMessage(error)}`))
    );
  } finally {
    store.dispatch(popRestorerLoader());
  }
}

export class DeepRestorerService {
  static SUPPORTED_NETWORKS: NetworkString[] = ['liquid', 'testnet', 'regtest'];

  private store: Store<RootReducerState>;
  private runningTask = false;

  constructor(store: Store<RootReducerState>) {
    this.store = store;
  }

  async restore(accountID: AccountID): Promise<void> {
    // wait for the previous task to finish
    while (this.runningTask) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    // run the task
    this.runningTask = true;
    try {
      const promisesByNetwork = DeepRestorerService.SUPPORTED_NETWORKS.map((network) =>
        restoreAccount(this.store, accountID, network)
      );
      await Promise.all(promisesByNetwork);
    } finally {
      this.runningTask = false;
    }
  }
}
