import { MasterPublicKey, UtxoInterface } from 'ldk';
import {
  AccountID,
  createMnemonicAccount,
  createMultisigAccount,
  MultisigAccount,
  MnemonicAccount,
  MainAccountID,
  Account,
} from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import { TxDisplayInterface } from '../../../domain/transaction';

export function masterPubKeySelector(state: RootReducerState): Promise<MasterPublicKey> {
  return selectMainAccount(state).getWatchIdentity();
}

export const selectUtxos =
  (...accounts: AccountID[]) =>
  (state: RootReducerState): UtxoInterface[] => {
    return accounts.flatMap((ID) => selectUtxosForAccount(ID)(state));
  };

const selectUtxosForAccount =
  (accountID: AccountID) =>
  (state: RootReducerState): UtxoInterface[] => {
    return Object.values(selectUnspentsAndTransactions(accountID)(state).utxosMap);
  };

export const selectTransactions =
  (...accounts: AccountID[]) =>
  (state: RootReducerState) => {
    return accounts.flatMap((ID) => selectTransactionsForAccount(ID)(state));
  };

const selectTransactionsForAccount =
  (accountID: AccountID) =>
  (state: RootReducerState): TxDisplayInterface[] => {
    return Object.values(
      selectUnspentsAndTransactions(accountID)(state).transactions[state.app.network]
    );
  };

export function hasMnemonicSelector(state: RootReducerState): boolean {
  return (
    state.wallet.mainAccount.encryptedMnemonic !== '' &&
    state.wallet.mainAccount.encryptedMnemonic !== undefined
  );
}

export function selectMainAccount(state: RootReducerState): MnemonicAccount {
  return createMnemonicAccount(state.wallet.mainAccount, state.app.network);
}

export function selectRestrictedAssetAccount(state: RootReducerState): MultisigAccount | undefined {
  if (!state.wallet.restrictedAssetAccount) return undefined;

  return createMultisigAccount(
    state.wallet.mainAccount.encryptedMnemonic,
    state.wallet.restrictedAssetAccount
  );
}

export const selectAllAccounts = (state: RootReducerState): Account[] => {
  const mainAccount = selectMainAccount(state);
  const restrictedAssetAccount = selectRestrictedAssetAccount(state);

  if (restrictedAssetAccount) {
    return [mainAccount, restrictedAssetAccount];
  }

  return [mainAccount];
};

export const selectAllAccountsIDs = (state: RootReducerState): AccountID[] => {
  return selectAllAccounts(state).map((account) => account.getAccountID());
};

export const selectAccount = (
  accountID: AccountID
): ((state: RootReducerState) => Account | undefined) =>
  accountID === MainAccountID ? selectMainAccount : selectRestrictedAssetAccount;

export const selectAccountForAsset = (asset: string) => (state: RootReducerState) => {
  // TODO hardcode restricted asset hashes
  if (asset === 'restricted_asset') {
    return selectRestrictedAssetAccount(state);
  }

  return selectMainAccount(state);
};

export const selectUnspentsAndTransactions =
  (accountID: AccountID) => (state: RootReducerState) => {
    return (
      state.wallet.unspentsAndTransactions[accountID] ?? {
        utxosMap: {},
        transactions: { regtest: {}, liquid: {} },
      }
    );
  };

export const selectDeepRestorerIsLoading = (state: RootReducerState) => {
  return state.wallet.deepRestorer.isLoading;
};

export const selectDeepRestorerGapLimit = (state: RootReducerState) => {
  return state.wallet.deepRestorer.gapLimit;
};
