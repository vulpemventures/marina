import type { AccountID, Account, AccountData } from '../../../domain/account';
import { createAccount, MainAccountID } from '../../../domain/account';
import type { NetworkString, UnblindedOutput } from 'ldk';
import type { RootReducerState } from '../../../domain/common';
import type { TxDisplayInterface, UtxosAndTxs } from '../../../domain/transaction';

export const selectUtxos =
  (...accounts: AccountID[]) =>
  (state: RootReducerState): UnblindedOutput[] => {
    return accounts.flatMap((ID) => selectUtxosForAccount(ID)(state));
  };

const selectUtxosForAccount =
  (accountID: AccountID, net?: NetworkString) =>
  (state: RootReducerState): UnblindedOutput[] => {
    const utxos = selectUnspentsAndTransactions(
      accountID,
      net ?? state.app.network
    )(state)?.utxosMap;
    if (utxos) {
      return Object.values(utxos);
    }
    return [];
  };

export const selectTransactions =
  (...accounts: AccountID[]) =>
  (state: RootReducerState) => {
    return accounts.flatMap((ID) => selectTransactionsForAccount(ID)(state));
  };

const selectTransactionsForAccount =
  (accountID: AccountID, net?: NetworkString) =>
  (state: RootReducerState): TxDisplayInterface[] => {
    const txs = selectUnspentsAndTransactions(
      accountID,
      net ?? state.app.network
    )(state)?.transactions;
    if (txs) {
      return Object.values(txs);
    }
    return [];
  };

export function hasMnemonicSelector(state: RootReducerState): boolean {
  return (
    state.wallet.encryptedMnemonic !== '' &&
    state.wallet.encryptedMnemonic !== undefined
  );
}

function selectInjectedAccountData(id: AccountID) {
  return (state: RootReducerState): AccountData | undefined => {
    const account = state.wallet.accounts[id];
    if (!account) {
      return;
    }
    return { ...account, encryptedMnemonic: state.wallet.encryptedMnemonic, type: account.type };
  };
}


export const selectAllAccounts = (state: RootReducerState): Account[] => {
  return selectAllAccountsIDs(state)
    .map((id) => selectInjectedAccountData(id)(state))
    .map((data) => data ? createAccount(data) : null)
    .filter((account): account is Account => account !== null); 
};

export const selectAllAccountsIDs = (state: RootReducerState): AccountID[] => {
  return Object.keys(state.wallet.accounts);
};

export function selectAccount(accountID: AccountID) {
  const accountDataSelector = selectInjectedAccountData(accountID);
  
  return (state: RootReducerState): Account => {
    const accountData = accountDataSelector(state);
    if (accountData) return createAccount(accountData);
    throw new Error(`Account ${accountID} not found`);
  }
};

export const selectMainAccount = selectAccount(MainAccountID);

// By definition, each asset hash should be associated with a single Account
export const selectAccountForAsset = (_: string) => (state: RootReducerState) => {
  return selectMainAccount(state);
};

export const selectUnspentsAndTransactions =
  (accountID: AccountID, network: NetworkString) =>
  (state: RootReducerState): UtxosAndTxs | undefined => {
    return state.wallet.unspentsAndTransactions[accountID][network];
  };

export const selectDeepRestorerIsLoading = (state: RootReducerState) => {
  return state.wallet.deepRestorer.isLoading;
};

export const selectDeepRestorerGapLimit = (state: RootReducerState) => {
  return state.wallet.deepRestorer.gapLimit;
};

export const selectUpdaterIsLoading = (state: RootReducerState) => {
  return state.wallet.updaterLoaders > 0;
};
