import * as bip39 from 'bip39';
import type { networks } from 'ldk';
import { payments } from 'ldk';
import * as bitcoinMessage from 'bitcoinjs-message';
import type { SignedMessage } from 'marina-provider';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

export async function signMessageWithMnemonic(
  message: string,
  mnemonic: string,
  network: networks.Network
): Promise<SignedMessage> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const node = BIP32Factory(ecc).fromSeed(seed, network);
  const child = node.derivePath("m/84'/0'/0'/0/0");
  const signature = await bitcoinMessage.signAsync(message, child.privateKey!, true, {
    segwitType: 'p2wpkh',
  });

  const pay = payments.p2wpkh({ pubkey: child.publicKey, network });
  return {
    signature: signature.toString('base64'),
    address: pay.address!,
    publicKey: child.publicKey.toString('hex'),
  };
}
