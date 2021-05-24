import { IdentityOpts, IdentityType, Mnemonic as MnemonicTdex } from 'ldk';

export type Mnemonic = string;

export function createMnemonic(mnemo: string): Mnemonic {
  // Trim start-end and replace multiple spaces in between with a single space
  const mnemonic = mnemo.trim().replace(/ +(?= )/g, '');

  try {
    // Mnemonic validation, network doesn't matter
    new MnemonicTdex({
      // TODO rename
      chain: 'liquid',
      type: IdentityType.Mnemonic,
      value: { mnemonic },
    } as IdentityOpts);
    return mnemonic;
  } catch (err) {
    throw new Error(err.message);
  }
}
