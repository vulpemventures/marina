import { MasterPublicKey, UtxoInterface, XPub } from 'ldk';
import {
  AccountID,
  createMnemonicAccount,
  createMultisigAccount,
  MainAccount,
  MultisigAccount,
  MultisigAccountData,
} from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import { TxDisplayInterface } from '../../../domain/transaction';
import { CosignerExtraData } from '../../../domain/wallet';

export function masterPubKeySelector(state: RootReducerState): Promise<MasterPublicKey> {
  return selectMainAccount(state).getWatchIdentity();
}

export const selectUtxos =
  (accountID: AccountID) =>
  (state: RootReducerState): UtxoInterface[] => {
    return Object.values(selectUnspentsAndTransactions(accountID)(state).utxosMap);
  };

export const selectTransactions =
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

export function selectMainAccount(state: RootReducerState): MainAccount {
  return createMnemonicAccount(state.wallet.mainAccount, state.app.network);
}

export const selectRestrictedAssetAccount = (cosignerXPub: XPub) =>
  function (state: RootReducerState): MultisigAccount {
    return createMultisigAccount(
      state.wallet.mainAccount.encryptedMnemonic,
      state.wallet.restrictedAssetAccounts[cosignerXPub],
      state.app.network
    );
  };

export function selectAllRestrictedAssetAccounts(
  state: RootReducerState
): MultisigAccountData<CosignerExtraData>[] {
  return Object.values(state.wallet.restrictedAssetAccounts);
}

export const selectUnspentsAndTransactions = (accountID: AccountID) => (state: RootReducerState) =>
  state.wallet.unspentsAndTransactions[accountID] ?? {
    utxosMap: {},
    transactions: { regtest: {}, liquid: {} },
  };
