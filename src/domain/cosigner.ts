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
import { ECPair, Transaction } from 'liquidjs-lib';
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

  // this is used instead of super.signPset in case of the input must be signed with SIGHASH_NONE + SIGHASH_ANYONE_CAN_PAY (allowance)
  private async signWithSighashNone(psetBase64: string): Promise<string> {
    const pset = decodePset(psetBase64);
    const signInputPromises: Promise<void>[] = [];

    for (let index = 0; index < pset.data.inputs.length; index++) {
      const input = pset.data.inputs[index];
      if (input.witnessUtxo) {
        const derivationPath = this.scriptToPath[input.witnessUtxo.script.toString('hex')];

        if (derivationPath) {
          // if there is an address generated for the input script: build the signing key pair.
          const privKey = this.baseNode.derivePath(derivationPath).privateKey;
          if (!privKey) throw new Error('signing private key is undefined');
          const signingKeyPair = ECPair.fromPrivateKey(privKey);
          // add the promise to array
          signInputPromises.push(
            pset.signInputAsync(index, signingKeyPair, [
              Transaction.SIGHASH_NONE + Transaction.SIGHASH_ANYONECANPAY,
            ])
          );
        }
      }
    }
    // wait that all signing promise resolved
    await Promise.all(signInputPromises);
    // return the signed pset, base64 encoded.
    return pset.toBase64();
  }

  async signPset(pset: string): Promise<string> {
    const toSign = addRedeemAndWitnessScriptsToInputs(pset, this);
    const signed = await super.signPset(toSign);
    return this.cosigner.signPset(signed, this.getXPub());
  }

  async allow(pset: string): Promise<string> {
    const toSign = addRedeemAndWitnessScriptsToInputs(pset, this);
    return this.signWithSighashNone(toSign);
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

  allow(pset: string) {
    return Promise.resolve();
  }
}
