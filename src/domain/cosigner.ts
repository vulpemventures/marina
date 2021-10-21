import { fromPublicKey, fromSeed } from 'bip32';
import { mnemonicToSeedSync } from 'bip39';
import {
  DEFAULT_BASE_DERIVATION_PATH,
  HDSignerMultisig,
  IdentityInterface,
  IdentityOpts,
  IdentityType,
  Mnemonic,
  Multisig,
  multisigFromEsplora,
  MultisigOpts,
  toXpub,
  XPub,
} from 'ldk';
import { networkFromString } from '../application/utils';
import { BlockstreamExplorerURLs, NigiriDefaultExplorerURLs } from './app';
import { Network } from './network';

export class MultisigWithCosigner extends Multisig implements IdentityInterface {
  private cosigner: Cosigner;

  constructor(opts: IdentityOpts<MultisigOpts>, cosigner: Cosigner) {
    super(opts);
    this.cosigner = cosigner;
  }

  async signPset(pset: string): Promise<string> {
    const signed = await super.signPset(pset);
    return this.cosigner.signPset(signed);
  }
}

export interface Cosigner {
  requestXPub(signerXPub: XPub): Promise<XPub>;
  signPset(pset: string): Promise<string>;
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
  private cosignerXPub: XPub;
  private network: Network;
  private esploraURL: string;

  constructor(network: Network, cosignerXPub: XPub) {
    this.mnemonic = new Mnemonic({
      chain: network,
      type: IdentityType.Mnemonic,
      opts: {
        mnemonic:
          'sponsor envelope waste fork indicate board survey tobacco laugh cover guitar layer',
        baseDerivationPath: DEFAULT_BASE_DERIVATION_PATH,
      },
    });
    this.network = network;
    this.esploraURL =
      network === 'liquid'
        ? BlockstreamExplorerURLs.esploraURL
        : NigiriDefaultExplorerURLs.esploraURL;
    this.cosignerXPub = cosignerXPub;
  }

  requestXPub(_: XPub) {
    return Promise.resolve(this.mnemonic.getXPub());
  }

  async signPset(pset: string) {
    if (this.cosignerXPub === undefined) {
      throw new Error('pairing is not done');
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
