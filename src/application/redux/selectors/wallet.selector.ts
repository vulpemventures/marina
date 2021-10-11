import { IdentityType, MasterPublicKey } from 'ldk';
import { createSelector } from 'reselect';
import { RootReducerState } from '../../../domain/common';

export const masterPubKeySelector = createSelector(
  [
    (state: RootReducerState) => state.app.network,
    (state: RootReducerState) => state.wallet.masterBlindingKey,
    (state: RootReducerState) => state.wallet.masterXPub,
  ],
  (network, masterBlindingKey, masterXPub) =>
    new MasterPublicKey({
      chain: network,
      type: IdentityType.MasterPublicKey,
      opts: {
        masterPublicKey: masterXPub,
        masterBlindingKey: masterBlindingKey,
      },
    })
);

export const selectAllUnspents = createSelector(
  [(state: RootReducerState) => state.wallet.utxoMap],
  (utxos) => Object.values(utxos)
);

export const selectRestorerOpts = (state: RootReducerState) => state.wallet.restorerOpts;

export function selectHasMnemonic(state: RootReducerState): boolean {
  return state.wallet.encryptedMnemonic !== '' && state.wallet.encryptedMnemonic !== undefined;
}
