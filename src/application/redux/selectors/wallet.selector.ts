import { IdentityRestorerFromState } from './../../utils/restorer';
import { address, fromXpub, IdentityType, MasterPublicKey } from 'ldk';
import { RootReducerState } from '../../../domain/common';

export function walletScripts(state: RootReducerState): string[] {
  const addresses = state.wallet.confidentialAddresses.map(a => a.value);
  const scripts = addresses.map(a => address.toOutputScript(a).toString('hex'));
  return scripts;
}

export function masterPubKeySelector(state: RootReducerState): MasterPublicKey {
  const { confidentialAddresses, masterBlindingKey, masterXPub } = state.wallet;
  const stateAddresses = confidentialAddresses.map((addr) => addr.value);
  const restorer = new IdentityRestorerFromState(stateAddresses);
  const network = state.app.network;
  const pubKeyWallet = new MasterPublicKey({
    chain: network,
    restorer,
    type: IdentityType.MasterPublicKey,
    value: {
      masterPublicKey: fromXpub(masterXPub, network),
      masterBlindingKey: masterBlindingKey,
    },
    initializeFromRestorer: true,
  });

  return pubKeyWallet;
}