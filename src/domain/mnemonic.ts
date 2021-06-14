import { IdentityOpts, IdentityType, Mnemonic as MnemonicIdentity, MnemonicOpts } from 'ldk';
import { Network } from './network';

export type Mnemonic = string;

export function createMnemonic(mnemo: string, network: Network): Mnemonic {
  // Trim start-end and replace multiple spaces in between with a single space
  const mnemonic = mnemo.trim().replace(/ +(?= )/g, '');

  try {
    // Mnemonic validation, network doesn't matter
    new MnemonicIdentity({
      chain: network,
      type: IdentityType.Mnemonic,
      opts: { mnemonic },
    } as IdentityOpts<MnemonicOpts>);
    return mnemonic;
  } catch (err) {
    throw new Error(err.message);
  }
}
