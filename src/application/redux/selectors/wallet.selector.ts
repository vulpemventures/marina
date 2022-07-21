import type {
  AccountID,
  Account,
  AccountData,
  CustomScriptAccountData,
} from '../../../domain/account';
import { AccountType, accountFromMnemonicAndData, MainAccountID } from '../../../domain/account';
import { decodePset } from 'ldk';
import type { NetworkString, Outpoint, UnblindedOutput } from 'ldk';
import type { RootReducerState } from '../../../domain/common';
import type { TxDisplayInterface, UtxosAndTxs } from '../../../domain/transaction';
import { toStringOutpoint } from '../../utils/utxos';

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
  return state.wallet.encryptedMnemonic !== '' && state.wallet.encryptedMnemonic !== undefined;
}

function selectInjectedAccountData(id: AccountID) {
  return (state: RootReducerState): AccountData | undefined => {
    const account = state.wallet.accounts[id];
    if (!account) {
      return;
    }
    return { ...account, encryptedMnemonic: state.wallet.encryptedMnemonic, type: account.type };
  };
}

const selectAccountIDFromCoin =
  (coin: Outpoint) =>
  (state: RootReducerState): AccountID | undefined => {
    const selectedNetwork = state.app.network;
    const strOutpoint = toStringOutpoint(coin);
    for (const [accountID, coinsAndTxs] of Object.entries(state.wallet.unspentsAndTransactions)) {
      const utxos = coinsAndTxs[selectedNetwork].utxosMap;
      if (utxos && utxos[strOutpoint]) {
        return accountID;
      }
    }
  };

export const selectAccountsFromCoins =
  (coins: Outpoint[]) =>
  (state: RootReducerState): Account[] => {
    const accountsIDs = new Set(
      coins
        .map(selectAccountIDFromCoin)
        .map((f) => f(state))
        .filter((id) => id)
    );
    return Array.from(accountsIDs).map((id) => selectAccount(id as AccountID)(state));
  };

export const selectAllAccountForSigningTxState = (state: RootReducerState): Account[] => {
  if (state.connect.tx?.pset === undefined) return [];
  const decoded = decodePset(state.connect.tx.pset);
  const inputsOutpoints = decoded.TX.ins.map((input) =>
    toStringOutpoint({ txid: Buffer.from(input.hash).reverse().toString('hex'), vout: input.index })
  );
  return selectAllAccounts(state).filter((account) => {
    const accountUtxos = selectUtxosForAccount(
      account.getInfo().accountID,
      state.app.network
    )(state);
    return accountUtxos.some((utxo) => inputsOutpoints.includes(toStringOutpoint(utxo)));
  });
};

export const selectAllAccounts = (state: RootReducerState): Account[] => {
  return selectAllAccountsIDs(state)
    .map((id) => selectInjectedAccountData(id)(state))
    .map((data) => (data ? accountFromMnemonicAndData(state.wallet.encryptedMnemonic, data) : null))
    .filter((account): account is Account => account !== null);
};

export const selectAllAccountsIDs = (state: RootReducerState): AccountID[] => {
  return Object.keys(state.wallet.accounts);
};

export const selectAllAccountsIDsSpendableViaUI = (state: RootReducerState): AccountID[] => {
  return selectAllAccountsIDs(state).filter(
    (id) =>
      state.wallet.accounts[id].type !== AccountType.CustomScriptAccount ||
      (state.wallet.accounts[id] as CustomScriptAccountData).covenantDescriptors.isSpendableByMarina
  );
};

export function selectAccount(accountID: AccountID) {
  const accountDataSelector = selectInjectedAccountData(accountID);

  return (state: RootReducerState): Account => {
    const accountData = accountDataSelector(state);
    if (accountData) return accountFromMnemonicAndData(state.wallet.encryptedMnemonic, accountData);
    throw new Error(`Account ${accountID} not found`);
  };
}

export const selectMainAccount = selectAccount(MainAccountID);

export const selectUnspentsAndTransactions =
  (accountID: AccountID, network: NetworkString) =>
  (state: RootReducerState): UtxosAndTxs | undefined => {
    return state.wallet.unspentsAndTransactions[accountID][network];
  };

export const selectDeepRestorerIsLoading = (state: RootReducerState): boolean => {
  return state.wallet.deepRestorer.restorerLoaders > 0;
};

export const selectDeepRestorerGapLimit = (state: RootReducerState) => {
  return state.wallet.deepRestorer.gapLimit;
};

export const selectUpdaterIsLoading = (state: RootReducerState) => {
  return state.wallet.updaterLoaders > 0;
};

export const selectEncryptedMnemonic = (state: RootReducerState) => {
  return state.wallet.encryptedMnemonic;
};

export const selectChangeAccount = (state: RootReducerState) => {
  return selectAccount(state.app.changeAccount)(state);
};
