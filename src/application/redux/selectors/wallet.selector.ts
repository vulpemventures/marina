import { IdentityType, MasterPublicKey, StateRestorerOpts, UnblindedOutput } from 'ldk';
import { RootReducerState } from '../../../domain/common';

export function masterPubKeySelector(state: RootReducerState): MasterPublicKey {
  const { masterBlindingKey, masterXPub } = state.wallet;
  const network = state.app.network;
  const pubKeyWallet = new MasterPublicKey({
    chain: network,
    type: IdentityType.MasterPublicKey,
    opts: {
      masterPublicKey: masterXPub,
      masterBlindingKey: masterBlindingKey,
    },
  });

  return pubKeyWallet;
}

export function restorerOptsSelector(state: RootReducerState): StateRestorerOpts {
  return state.wallet.restorerOpts;
}

export function utxosSelector(state: RootReducerState): UnblindedOutput[] {
  return Object.values(state.wallet.utxoMap);
}

export function hasMnemonicSelector(state: RootReducerState): boolean {
  return state.wallet.encryptedMnemonic !== '' && state.wallet.encryptedMnemonic !== undefined;
}

export function selectUpdaterLoaders(state: RootReducerState): { utxos: boolean; txs: boolean } {
  return state.wallet.updaterLoaders;
}
