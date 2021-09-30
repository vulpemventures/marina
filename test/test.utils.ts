import { generateMnemonic } from 'bip39';
import { IdentityType, Mnemonic } from 'ldk';

export function makeRandomMnemonic(): Mnemonic {
  const mnemo = generateMnemonic();
  return new Mnemonic({ type: IdentityType.Mnemonic, chain: 'regtest', opts: { mnemonic: mnemo } });
}
