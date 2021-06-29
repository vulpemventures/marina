import { IdentityType, MasterPublicKey, StateRestorerOpts } from 'ldk';
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
