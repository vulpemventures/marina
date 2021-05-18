import { address } from 'ldk';
import { RootReducerState } from '../../../domain/common';

export function walletScripts(state: RootReducerState): string[] {
  const addresses = state.wallet.confidentialAddresses.map(a => a.value);
  const scripts = addresses.map(a => address.toOutputScript(a).toString('hex'));
  return scripts;
}