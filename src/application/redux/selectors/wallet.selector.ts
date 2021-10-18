import { MasterPublicKey, UtxoInterface } from 'ldk';
import { AccountID, createMnemonicAccount, MainAccount } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import { TxDisplayInterface } from '../../../domain/transaction';

export function masterPubKeySelector(state: RootReducerState): Promise<MasterPublicKey> {
  return selectMainAccount(state).getWatchIdentity();
}

export const selectUtxos = (accountID: AccountID) => (state: RootReducerState): UtxoInterface[] => {
  return Object.values(state.wallet.unspentsAndTransactions[accountID].utxosMap || {});
}

export const selectTransactions = (accountID: AccountID) => (state: RootReducerState): TxDisplayInterface[] => {
  return Object.values(state.wallet.unspentsAndTransactions[accountID].transactions[state.app.network] || {});
}

export function hasMnemonicSelector(state: RootReducerState): boolean {
  return (
    state.wallet.mainAccount.encryptedMnemonic !== '' &&
    state.wallet.mainAccount.encryptedMnemonic !== undefined
  );
}

export function selectMainAccount(state: RootReducerState): MainAccount {
  return createMnemonicAccount(state.wallet.mainAccount, state.app.network);
}
