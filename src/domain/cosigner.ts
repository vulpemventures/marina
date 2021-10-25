import {
  decodePset,
  DEFAULT_BASE_DERIVATION_PATH,
  IdentityInterface,
  IdentityOpts,
  IdentityType,
  Multisig,
  multisigFromEsplora,
  MultisigOpts,
  XPub,
} from 'ldk';
import { BlockstreamExplorerURLs, NigiriDefaultExplorerURLs } from './app';
import { Network } from './network';

function decodeMultisigPath(path: string) {
  const splitted = path.split('/');
  return { change: parseInt(splitted[0]), index: parseInt(splitted[1]) };
}

function addRedeemAndWitnessScriptsToInputs(pset: string, multisig: Multisig): string {
  const decoded = decodePset(pset);
  let inputIndex = 0;
  for (const input of decoded.data.inputs) {
    if (!input.witnessUtxo) continue;
    const path = multisig.scriptToPath[input.witnessUtxo.script.toString('hex')];
    if (path) {
      const { change, index } = decodeMultisigPath(path);
      const p2ms = multisig.getMultisigAddress(change, index);
      decoded.updateInput(inputIndex, {
        redeemScript: Buffer.from(p2ms.redeemScript, 'hex'),
        witnessScript: Buffer.from(p2ms.witnessScript, 'hex'),
      });
    }

    inputIndex++;
  }
  return decoded.toBase64();
}

export class MultisigWithCosigner extends Multisig implements IdentityInterface {
  private cosigner: Cosigner;

  constructor(opts: IdentityOpts<MultisigOpts>, cosigner: Cosigner) {
    super(opts);
    this.cosigner = cosigner;
  }

  async signPset(pset: string): Promise<string> {
    const toSign = addRedeemAndWitnessScriptsToInputs(pset, this);
    const signed = await super.signPset(toSign);
    return this.cosigner.signPset(signed, this.getXPub());
  }
}

export interface Cosigner {
  xPub(): Promise<XPub>;
  signPset(pset: string, xpub: XPub): Promise<string>;
}

export class MockedCosigner implements Cosigner {
  private mnemonic =
    'sponsor envelope waste fork indicate board survey tobacco laugh cover guitar layer';
  private network: Network;
  private esploraURL: string;

  constructor(network: Network) {
    this.network = network;
    this.esploraURL =
      network === 'liquid'
        ? BlockstreamExplorerURLs.esploraURL
        : NigiriDefaultExplorerURLs.esploraURL;
  }

  xPub() {
    return Promise.resolve(
      'xpub661MyMwAqRbcFgkcqS2dYiVoJLc9QEiVQLPcyG1pkVi2UTUSe8dCAjkUVqczLiamx4R9jrSj6GefRRFZyF9cfApymZm4WzazurfdaAYWqhb'
    );
  }

  async signPset(pset: string, cosignerXPub: XPub) {
    const multisigID = await multisigFromEsplora(
      new Multisig({
        chain: this.network,
        type: IdentityType.Multisig,
        opts: {
          requiredSignatures: 2,
          cosigners: [cosignerXPub],
          signer: {
            mnemonic: this.mnemonic,
            baseDerivationPath: DEFAULT_BASE_DERIVATION_PATH,
          },
        },
      })
    )({ esploraURL: this.esploraURL, gapLimit: 20 });

    await multisigID.getNextAddress();
    const signed = await multisigID.signPset(pset);

    if (!decodePset(signed).validateSignaturesOfAllInputs()) {
      throw new Error('Mocked cosigner: not able to sign pset');
    }
    return signed;
  }
}
