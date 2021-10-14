import { MasterPublicKey, UtxoInterface } from 'ldk';
import { createMnemonicAccount, MainAccount } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';

export function masterPubKeySelector(state: RootReducerState): Promise<MasterPublicKey> {
  return selectMainAccount(state).getWatchIdentity();
}

export function utxosSelector(state: RootReducerState): UtxoInterface[] {
  return Object.values(state.wallet.utxoMap);
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
