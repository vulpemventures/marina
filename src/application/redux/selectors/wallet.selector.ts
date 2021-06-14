import { address, IdentityType, MasterPublicKey, StateRestorerOpts } from 'ldk';
import { getStateRestorerOptsFromAddresses } from '../../utils/restorer';
import { RootReducerState } from '../../../domain/common';

export function walletScripts(state: RootReducerState): string[] {
  const addresses = state.wallet.confidentialAddresses.map((a) => a.value);
  const scripts = addresses.map((a) => address.toOutputScript(a).toString('hex'));
  return scripts;
}

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
  const { confidentialAddresses } = state.wallet;
  return getStateRestorerOptsFromAddresses(confidentialAddresses);
}
