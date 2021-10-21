import { MasterPublicKey, UtxoInterface } from 'ldk';
import {
  AccountID,
  createMnemonicAccount,
  createMultisigAccount,
  MultisigAccount,
  MultisigAccountData,
  MnemonicAccount,
  MainAccountID,
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

export function selectMainAccount(state: RootReducerState): MnemonicAccount {
  return createMnemonicAccount(state.wallet.mainAccount, state.app.network);
}

function selectRestrictedAssetAccount(state: RootReducerState): MultisigAccount | undefined {
  if (!state.wallet.restrictedAssetAccount) return undefined;

  return createMultisigAccount(
    state.wallet.mainAccount.encryptedMnemonic,
    state.wallet.restrictedAssetAccount
  );
};

export const selectAccount = (accountID: AccountID) =>
  accountID === MainAccountID ? selectMainAccount : selectRestrictedAssetAccount;

export const selectAccountForReceive = (asset: string) => (state: RootReducerState) => {
  const assets = state.assets
}

export const selectUnspentsAndTransactions =
  (accountID: AccountID) => (state: RootReducerState) => {
    return (
      state.wallet.unspentsAndTransactions[accountID] ?? {
        utxosMap: {},
        transactions: { regtest: {}, liquid: {} },
      }
    );
  };
