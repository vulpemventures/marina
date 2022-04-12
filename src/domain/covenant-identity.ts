import type {
  AddressInterface,
  IdentityInterface,
  IdentityOpts,
  Restorer,
  EsploraRestorerOpts,
  NetworkString,
  StateRestorerOpts} from 'ldk';
import {
  Identity,
  crypto,
  Mnemonic,
  address,
  Psbt,
  restorerFromEsplora,
  IdentityType,
  restorerFromState,
  Transaction,
  bip341,
} from 'ldk';
import type { BlindingDataLike } from 'liquidjs-lib/src/psbt';
import { evaluate } from '../descriptors';
import type { Result } from '../descriptors/ast';
import type { Context } from '../descriptors/preprocessing';
import { SLIP77Factory } from 'slip77';
import * as ecc from 'tiny-secp256k1';
import BIP32Factory from 'bip32';

// slip13: https://github.com/satoshilabs/slips/blob/master/slip-0013.md#hd-structure
function namespaceToDerivationPath(namespace: string): string {
  const hash = crypto.sha256(Buffer.from(namespace));
  const hash128 = hash.slice(0, 16);
  const A = hash128.readUint32LE(0);
  const B = hash128.readUint32LE(4);
  const C = hash128.readUint32LE(8);
  const D = hash128.readUint32LE(12);
  return `m/13'/${A}'/${B}'/${C}'/${D}'`;
}

export interface TaprootAddressInterface extends AddressInterface {
  result: Result;
}

export interface CovenantDescriptors {
  namespace: string;
  template?: string;
}

export type CovenantIdentityOpts = CovenantDescriptors & {
  mnemonic: string;
};

export type TemplateIdentityWatchOnlyOpts = CovenantDescriptors & {
  masterBlindingKey: string;
  masterPublicKey: string;
};

export class CovenantIdentityWatchOnly extends Identity implements IdentityInterface {
  private index = 0;
  private changeIndex = 0;
  protected cache = new Map<string, TaprootAddressInterface>();
  readonly masterBlindingKeyNode: Mnemonic['masterBlindingKeyNode'];
  readonly masterPubKeyNode: Mnemonic['masterPublicKeyNode']; 
  readonly namespace: CovenantIdentityOpts['namespace'];
  template?: string;

  constructor(args: IdentityOpts<TemplateIdentityWatchOnlyOpts>) {
    super(args);
    this.namespace = args.opts.namespace;
    this.template = args.opts.template;
    this.masterBlindingKeyNode = SLIP77Factory(this.ecclib).fromMasterBlindingKey(args.opts.masterBlindingKey);
    this.masterPubKeyNode = BIP32Factory(this.ecclib).fromBase58(args.opts.masterPublicKey);
  }


  private deriveMasterXPub(isChange: boolean, index: number): string {
    return this.masterPubKeyNode.derivePath(makePath(isChange, index)).publicKey.toString('hex');
  }

  private getContext(isChange: boolean, index: number): Context {
    return {
      namespaces: new Map().set(this.namespace, this.deriveMasterXPub(isChange, index)),
    };
  }

  protected getBlindingKeyPair(
    scriptPubKey: string,
    checkScript = false
  ): { publicKey: Buffer; privateKey: Buffer } {
    if (checkScript && !this.cache.has(scriptPubKey))
      throw new Error(`unknow blinding key for script ${scriptPubKey}`);
    const { publicKey, privateKey } = this.masterBlindingKeyNode.derive(scriptPubKey);
    return { publicKey: publicKey!, privateKey: privateKey! };
  }

  private cacheAddress(addr: TaprootAddressInterface) {
    const scriptPubKey = address.toOutputScript(addr.confidentialAddress, this.network);
    this.cache.set(scriptPubKey.toString('hex'), addr);
  }

  getAddress(isChange: boolean, index: number): TaprootAddressInterface {
    if (!this.template) throw new Error('template is missing');
    const descriptorResult = evaluate(this.getContext(isChange, index), this.template);
    const outputScript = descriptorResult.scriptPubKey().toString('hex');
    if (!descriptorResult.taprootHashTree) throw new Error('taprootHashTree is missing');
    return { ...this.outputScriptToAddressInterface(outputScript), result: descriptorResult, derivationPath: makePath(isChange, index) };
  }

  getNextAddress(): Promise<TaprootAddressInterface> {
    const addr = this.getAddress(false, this.index);
    this.cacheAddress(addr);
    this.index++;
    return Promise.resolve(addr);
  }

  getNextChangeAddress(): Promise<TaprootAddressInterface> {
    const addr = this.getAddress(true, this.changeIndex);
    this.cacheAddress(addr);
    this.changeIndex++;
    return Promise.resolve(addr);
  }

  private outputScriptToAddressInterface(outputScript: string): AddressInterface {
    const blindingKeyPair = this.getBlindingKeyPair(outputScript);
    const unconfidentialAddress = address.fromOutputScript(
      Buffer.from(outputScript, 'hex'),
      this.network
    );
    const confidentialAddress = address.toConfidential(
      unconfidentialAddress,
      blindingKeyPair.publicKey
    );
    return {
      confidentialAddress,
      blindingPrivateKey: blindingKeyPair.privateKey.toString('hex'),
    };
  }

  signPset(_: string): Promise<string> {
    throw new Error('watch only identity');
  }

  getAddresses(): Promise<TaprootAddressInterface[]> {
    return Promise.resolve(Array.from(this.cache.values()));
  }

  getBlindingPrivateKey(script: string): Promise<string> {
    return Promise.resolve(this.getBlindingKeyPair(script).privateKey.toString('hex'));
  }

  blindPset(
    psetBase64: string,
    outputsIndexToBlind: number[],
    outputsPubKeysByIndex?: Map<number, string>,
    inputsBlindingDataLike?: Map<number, BlindingDataLike>
  ): Promise<string> {
    return super.blindPsetWithBlindKeysGetter(
      (script: Buffer) => this.getBlindingKeyPair(script.toString('hex'), true),
      psetBase64,
      outputsIndexToBlind,
      outputsPubKeysByIndex,
      inputsBlindingDataLike
    );
  }

  isAbleToSign(): boolean {
    return false;
  }
}

function withoutUndefined<T>(arr: Array<T | undefined>): Array<T> {
  return arr.filter((x) => x !== undefined) as Array<T>;
}

export class CovenantIdentity extends CovenantIdentityWatchOnly implements IdentityInterface {
  readonly masterPrivateKeyNode: Mnemonic['masterPrivateKeyNode'];
  readonly masterBlindingKeyNode: Mnemonic['masterBlindingKeyNode'];
  
  readonly masterPublicKey: string;
  readonly masterBlindingKey: string;

  constructor(args: IdentityOpts<CovenantIdentityOpts>) {
    // we use mnemonic identity to build the bip32 & slip77 nodes
    const mnemonic = new Mnemonic({
      ...args,
      opts: {
        mnemonic: args.opts.mnemonic,
        baseDerivationPath: namespaceToDerivationPath(args.opts.namespace),
      },
    });

    super({
      ...args,
      opts: {
        namespace: args.opts.namespace,
        template: args.opts.template,
        masterPublicKey: mnemonic.masterPublicKey,
        masterBlindingKey: mnemonic.masterBlindingKey,
      },
    });

    this.masterPrivateKeyNode = mnemonic.masterPrivateKeyNode;
    this.masterBlindingKeyNode = mnemonic.masterBlindingKeyNode;
    this.masterPublicKey = mnemonic.masterPublicKey;
    this.masterBlindingKey = mnemonic.masterBlindingKey;
  }

  isAbleToSign(): boolean {
    return true;
  }

  private signSchnorr(derivationPath: string, msg: Buffer): Buffer {
    const signer = this.masterPrivateKeyNode.derivePath(derivationPath);
    return signer.signSchnorr(msg)
  }

  signPset(psetBase64: string): Promise<string> {
    const pset = Psbt.fromBase64(psetBase64);

    // check if all inputs have witnessUtxo
    // this is needed to get prevout values and assets
    const inputsWitnessUtxos = pset.data.inputs.map(i => i.witnessUtxo);
    const inputsUtxos = withoutUndefined(inputsWitnessUtxos);
    if (inputsUtxos.length !== inputsWitnessUtxos.length) {
      throw new Error('missing witnessUtxo, all inputs need witnessUtxo');
    }

    for (let index = 0; index < pset.data.inputs.length; index++) {
      const input = pset.data.inputs[index];
      // current version of pset does not support taproot field (BIP371)
      // as a temp solution, we use the finalScriptWitness to "signal" the leaf to sign
      if (input.witnessUtxo && input.finalScriptWitness) {
        const script = input.witnessUtxo.script.toString('hex');
        const cachedAddrInfos = this.cache.get(script);
        // check if we own the input, and if have `witnesses` member
        if (cachedAddrInfos && cachedAddrInfos.result.witnesses && cachedAddrInfos.derivationPath) {

          try {
            const leafScript = input.finalScriptWitness.toString('hex');
            // witnesses func will throw if the leaf is not a valid leaf
            // this MUST skip error in order to skip the signed inputs
            const taprootSignScriptStack = cachedAddrInfos.result.witnesses(leafScript);

            // default leaf version is used
            const leafHash = bip341.tapLeafHash({
              scriptHex: leafScript,
            })

            const sighashForSig = pset.TX.hashForWitnessV1(
              index,
              inputsUtxos.map(u => u.script),
              inputsUtxos.map(u => ({ value: u.value, asset: u.asset })),
              Transaction.SIGHASH_DEFAULT,
              this.network.genesisBlockHash,
              leafHash
            )

            const sig = this.signSchnorr(cachedAddrInfos.derivationPath, sighashForSig);

            const witnessStack = [
              sig,
              ...taprootSignScriptStack,
            ];

            const signedPset = pset
              .updateInput(index, { finalScriptWitness: Buffer.concat(witnessStack) })
              .toBase64();
            return Promise.resolve(signedPset);
          } catch (e) {
            // we skip errors, try to sign the next input
            continue;
          }
        }
      }
    }

    return Promise.reject(new Error('no input to sign with leaf found'));
  }
}

// restorers

export function covenantRestorerFromEsplora<T extends CovenantIdentityWatchOnly>(
  toRestore: T
): Restorer<EsploraRestorerOpts, T> {
  return restorerFromEsplora(toRestore, function (isChange: boolean, index: number): string {
    return toRestore.getAddress(isChange, index).confidentialAddress;
  });
}

export function restoredCovenantIdentity(
  covenantDescriptors: CovenantDescriptors,
  mnemonic: string,
  network: NetworkString,
  restorerOpts: StateRestorerOpts
): Promise<CovenantIdentity> {
  return restorerFromState<CovenantIdentity>(
    new CovenantIdentity({
      type: IdentityType.Mnemonic,
      chain: network,
      ecclib: ecc,
      opts: {
        ...covenantDescriptors,
        mnemonic,
      },
    })
  )(restorerOpts);
}

export function restoredCovenantWatchOnlyIdentity(
  covenantDescriptors: CovenantDescriptors,
  masterPublicKey: string,
  masterBlindingKey: string,
  network: NetworkString,
  restorerOpts: StateRestorerOpts
): Promise<CovenantIdentityWatchOnly> {
  return restorerFromState<CovenantIdentityWatchOnly>(
    new CovenantIdentityWatchOnly({
      type: IdentityType.MasterPublicKey,
      chain: network,
      ecclib: ecc,
      opts: {
        ...covenantDescriptors,
        masterPublicKey,
        masterBlindingKey,
      },
    })
  )(restorerOpts);
}

function makePath(isChange: boolean, index: number): string {
  return `${isChange ? 1 : 0}/${index}`;
}