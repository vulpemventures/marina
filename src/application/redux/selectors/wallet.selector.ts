import type {
  AccountID,
  Account,
  AccountData,
  CustomScriptAccountData,
} from '../../../domain/account';
import { AccountType, accountFromMnemonicAndData, MainAccountID } from '../../../domain/account';
import { decodePset } from 'ldk';
import type { NetworkString, Outpoint, UnblindedOutput, StateRestorerOpts } from 'ldk';
import type { RootReducerState } from '../../../domain/common';
import type { TxDisplayInterface, UtxosMap } from '../../../domain/transaction';
import { toStringOutpoint } from '../../utils/utxos';
import { selectNetwork } from './app.selector';

export const selectUtxos =
  (...accounts: AccountID[]) =>
  (state: RootReducerState): UnblindedOutput[] => {
    const lockedOutpoints = Object.keys(state.utxosTransactions.lockedUtxos);
    return accounts
      .flatMap((ID) => selectUtxosForAccount(ID)(state))
      .filter((utxo) => !lockedOutpoints.includes(toStringOutpoint(utxo)));
  };

const selectUtxosForAccount =
  (accountID: AccountID, net?: NetworkString) =>
  (state: RootReducerState): UnblindedOutput[] => {
    const utxosState = selectUtxosState(accountID, net ?? state.app.network)(state);
    if (!utxosState) return [];
    const utxos = [];
    for (const utxoMap of Object.values(utxosState)) {
      utxos.push(...Object.values(utxoMap));
    }
    return utxos;
  };

export const selectTransactions =
  (...accounts: AccountID[]) =>
  (state: RootReducerState) => {
    return accounts.flatMap((ID) => selectTransactionsForAccount(ID)(state));
  };

const selectTransactionsForAccount =
  (accountID: AccountID, net?: NetworkString) =>
  (state: RootReducerState): TxDisplayInterface[] => {
    const txs = selectTransactionState(accountID, net ?? state.app.network)(state);
    if (txs) return Object.values(txs);
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
    const strOutpoint = toStringOutpoint(coin);
    for (const accountID of selectAllAccountsIDs(state)) {
      const utxos = selectUtxos(accountID)(state);
      if (
        utxos &&
        utxos.length > 0 &&
        utxos.some((utxo) => toStringOutpoint(utxo) === strOutpoint)
      ) {
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

export const selectAllAccounts = (state: RootReducerState, expectReady = true): Account[] => {
  return selectAllAccountsIDs(state)
    .map((id) => selectInjectedAccountData(id)(state))
    .map((data) => (data ? accountFromMnemonicAndData(state.wallet.encryptedMnemonic, data) : null))
    .filter(
      (account): account is Account => account !== null && account.getInfo().isReady === expectReady
    );
};

export const selectAllAccountsIDs = (state: RootReducerState): AccountID[] => {
  return Object.keys(state.wallet.accounts);
};

export const selectAllAccountsIDsSpendableViaUI = (state: RootReducerState): AccountID[] => {
  return selectAllAccountsIDs(state)
    .filter((id) => selectAccount(id)(state).getInfo().isReady)
    .filter(
      (id) =>
        state.wallet.accounts[id].type !== AccountType.CustomScriptAccount ||
        (state.wallet.accounts[id] as CustomScriptAccountData).contractTemplate.isSpendableByMarina
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

export const selectTransactionState =
  (accountID: AccountID, network: NetworkString) => (state: RootReducerState) => {
    return state.utxosTransactions.transactions[network][accountID];
  };

export const selectUtxosState =
  (accountID: AccountID, network: NetworkString) => (state: RootReducerState) => {
    return state.utxosTransactions.utxos[network][accountID];
  };

export const selectUtxosMapByScriptHash =
  (network: NetworkString, scriptHash: string) =>
  (state: RootReducerState): [UtxosMap, AccountID] => {
    const byNetwork = state.utxosTransactions.utxos[network];
    for (const [accountID, utxosMap] of Object.entries(byNetwork)) {
      const utxo = utxosMap[scriptHash];
      if (utxo !== undefined) return [utxo, accountID as AccountID];
    }
    throw new Error('scripthash map not found in reducer');
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

export function selectRestorerOpts<T extends StateRestorerOpts>(account: AccountID) {
  return (state: RootReducerState): T => {
    const net = selectNetwork(state);
    return state.wallet.accounts[account].restorerOpts[net];
  };
}
