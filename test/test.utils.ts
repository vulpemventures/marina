import { generateMnemonic } from 'bip39';
import { IdentityType, Mnemonic } from 'ldk';
import * as ecc from 'tiny-secp256k1';

export function makeRandomMnemonic(): Mnemonic {
  const mnemo = generateMnemonic();
  return new Mnemonic({
    type: IdentityType.Mnemonic,
    chain: 'regtest',
    opts: { mnemonic: mnemo },
    ecclib: ecc,
  });
}
