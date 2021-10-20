import { fromPublicKey, fromSeed } from 'bip32';
import { mnemonicToSeedSync } from 'bip39';
import {
  DEFAULT_BASE_DERIVATION_PATH,
  HDSignerMultisig,
  IdentityType,
  Mnemonic,
  Multisig,
  multisigFromEsplora,
  toXpub,
  XPub,
} from 'ldk';
import { networkFromString } from '../application/utils';
import { Network } from './network';

export interface Cosigner {
  requestXPub(signerXPub: XPub): Promise<XPub>;
  signPset(pset: string, signWith: XPub): Promise<string>;
}

export function HDSignerToXPub(signer: HDSignerMultisig, network: Network) {
  const walletSeed = mnemonicToSeedSync(signer.mnemonic);
  const net = networkFromString(network);
  const baseNode = fromSeed(walletSeed, net).derivePath(
    signer.baseDerivationPath || DEFAULT_BASE_DERIVATION_PATH
  );
  return toXpub(fromPublicKey(baseNode.publicKey, baseNode.chainCode, net).toBase58());
}

export class MockedCosigner implements Cosigner {
  private mnemonic: Mnemonic;
  private cosignerXPub: XPub | undefined;
  private network: Network;
  private esploraURL: string;

  constructor(network: Network, esploraURL: string) {
    this.mnemonic = Mnemonic.Random(network, DEFAULT_BASE_DERIVATION_PATH);
    this.network = network;
    this.esploraURL = esploraURL;
  }

  requestXPub(singerXPub: XPub) {
    this.cosignerXPub = singerXPub;
    return Promise.resolve(this.mnemonic.getXPub());
  }

  async signPset(pset: string, signWith: XPub) {
    if (this.cosignerXPub === undefined) {
      throw new Error('pairing is not done');
    }

    if (signWith !== this.mnemonic.getXPub()) {
      throw new Error(`can only sign with ${this.mnemonic.getXPub()}`);
    }

    const multisigID = await multisigFromEsplora(
      new Multisig({
        chain: this.network,
        type: IdentityType.Multisig,
        opts: {
          requiredSignatures: 2,
          cosigners: [this.cosignerXPub],
          signer: {
            mnemonic: this.mnemonic.mnemonic,
            baseDerivationPath: DEFAULT_BASE_DERIVATION_PATH,
          },
        },
      })
    )({ esploraURL: this.esploraURL, gapLimit: 20 });

    return multisigID.signPset(pset);
  }
}
