import { Network } from './network';
import { validateMnemonic } from 'bip39';

export type Mnemonic = string;

export function createMnemonic(mnemo: string, network: Network): Mnemonic {
  // Trim start-end and replace multiple spaces in between with a single space
  const mnemonic = mnemo.trim().replace(/ +(?= )/g, '');

  // Mnemonic validation, network doesn't matter
  if (!validateMnemonic(mnemonic)) throw new Error('Invalid mnemonic');
  return mnemonic;
}
