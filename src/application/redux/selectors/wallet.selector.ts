import {
  AccountID,
  createMnemonicAccount,
  MnemonicAccount,
  MainAccountID,
  Account,
} from '../../../domain/account';
import { MasterPublicKey, NetworkString, UnblindedOutput } from 'ldk';
import { RootReducerState } from '../../../domain/common';
import { TxDisplayInterface, UtxosAndTxs } from '../../../domain/transaction';
import { toStringOutpoint } from '../../utils/utxos';

export function masterPubKeySelector(state: RootReducerState): Promise<MasterPublicKey> {
  return selectMainAccount(state).getWatchIdentity(state.app.network);
}

export const selectUtxos =
  (...accounts: AccountID[]) =>
  (state: RootReducerState): UnblindedOutput[] => {
    const lockedOutpoints = Object.keys(state.wallet.lockedUtxos);
    return accounts
      .flatMap((ID) => selectUtxosForAccount(ID)(state))
      .filter((utxo) => !lockedOutpoints.includes(toStringOutpoint(utxo)));
  };

const selectUtxosForAccount =
  (accountID: AccountID, net?: NetworkString) =>
  (state: RootReducerState): UnblindedOutput[] => {
    const utxos = selectUnspentsAndTransactions(
      accountID,
      net ?? state.app.network
    )(state)?.utxosMap;
    if (utxos) return Object.values(utxos);
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
    state.wallet.mainAccount.encryptedMnemonic !== '' &&
    state.wallet.mainAccount.encryptedMnemonic !== undefined
  );
}

export function selectMainAccount(state: RootReducerState): MnemonicAccount {
  return createMnemonicAccount(state.wallet.mainAccount);
}

export const selectAllAccounts = (state: RootReducerState): Account[] => {
  const mainAccount = selectMainAccount(state);
  return [mainAccount];
};

export const selectAllAccountsIDs = (state: RootReducerState): AccountID[] => {
  return selectAllAccounts(state).map((account) => account.getAccountID());
};

export const selectAccount = (
  accountID: AccountID
): ((state: RootReducerState) => Account | undefined) => {
  if (accountID === MainAccountID) {
    return selectMainAccount;
  }

  // TODO multiple accounts: we need to modify the way we select account via ID
  return () => undefined;
};

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
