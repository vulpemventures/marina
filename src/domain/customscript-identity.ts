import {
  Identity,
  crypto,
  address,
  Psbt,
  restorerFromEsplora,
  IdentityType,
  restorerFromState,
  Transaction,
  bip341,
  toXpub,
  checkIdentityType,
  checkMnemonic,
  networks,
  fromXpub,
  validate,
  makeEvaluateDescriptor,
  analyzeTapscriptTree,
} from 'ldk';
import type {
  AddressInterface,
  IdentityInterface,
  IdentityOpts,
  Restorer,
  EsploraRestorerOpts,
  NetworkString,
  StateRestorerOpts,
  Mnemonic,
  TemplateResult,
  Context,
  ScriptInputsNeeds,
} from 'ldk';
import type { BlindingDataLike } from 'liquidjs-lib/src/psbt';
import { SLIP77Factory } from 'slip77';
import * as ecc from 'tiny-secp256k1';
import type { BIP32Interface } from 'bip32';
import BIP32Factory from 'bip32';
import { mnemonicToSeedSync } from 'bip39';

const evaluate = makeEvaluateDescriptor(ecc);

// slip13: https://github.com/satoshilabs/slips/blob/master/slip-0013.md#hd-structure
function namespaceToDerivationPath(namespace: string): string {
  const hash = crypto.sha256(Buffer.from(namespace));
  const hash128 = hash.slice(0, 16);
  const A = hash128.readUInt32LE(0) || 0x80000000;
  const B = hash128.readUint32LE(4) || 0x80000000;
  const C = hash128.readUint32LE(8) || 0x80000000;
  const D = hash128.readUint32LE(12) || 0x80000000;
  return `m/${A}/${B}/${C}/${D}`;
}

function makeBaseNodeFromNamespace(m: BIP32Interface, namespace: string): BIP32Interface {
  const path = namespaceToDerivationPath(namespace);
  return m.derivePath(path);
}

interface ExtendedTaprootAddressInterface extends AddressInterface {
  result: TemplateResult;
  tapscriptNeeds: Record<string, ScriptInputsNeeds>; // scripthex -> needs
}

export type TaprootAddressInterface = AddressInterface &
  Omit<ExtendedTaprootAddressInterface, 'result' | 'tapscriptNeeds'> & {
    taprootHashTree?: bip341.HashTree;
    taprootInternalKey?: string;
  };

function asTaprootAddressInterface(
  extended: ExtendedTaprootAddressInterface
): TaprootAddressInterface {
  return {
    confidentialAddress: extended.confidentialAddress,
    blindingPrivateKey: extended.blindingPrivateKey,
    derivationPath: extended.derivationPath,
    taprootHashTree: extended.result.taprootHashTree,
    taprootInternalKey: extended.result.taprootInternalKey,
  };
}

export interface CovenantDescriptors {
  namespace: string;
  template?: string;
  changeTemplate?: string;
  isSpendableByMarina?: boolean;
}

export type CustomScriptIdentityOpts = CovenantDescriptors & {
  mnemonic: string;
};

export type TemplateIdentityWatchOnlyOpts = CovenantDescriptors & {
  masterBlindingKey: string;
  masterPublicKey: string;
};

interface IdentityOptsWithSchnorr<opt> extends IdentityOpts<opt> {
  ecclib: IdentityOpts<opt>['ecclib'] & bip341.TinySecp256k1Interface;
}

export class CustomScriptIdentityWatchOnly extends Identity implements IdentityInterface {
  private index = 0;
  private changeIndex = 0;
  protected cache = new Map<string, ExtendedTaprootAddressInterface>();
  readonly masterBlindingKeyNode: Mnemonic['masterBlindingKeyNode'];
  readonly masterPubKeyNode: Mnemonic['masterPublicKeyNode'];
  readonly namespace: CustomScriptIdentityOpts['namespace'];
  readonly covenant: CovenantDescriptors;
  readonly ecclib: IdentityOpts<any>['ecclib'] & bip341.TinySecp256k1Interface;

  constructor(args: IdentityOptsWithSchnorr<TemplateIdentityWatchOnlyOpts>) {
    super(args);

    if (args.opts.namespace.length === 0) throw new Error('namespace is required');
    this.namespace = args.opts.namespace;

    if (args.opts.changeTemplate) {
      if (!validate(args.opts.changeTemplate)) throw new Error('invalid changeTemplate');
      if (!args.opts.template) throw new Error('template is required if u setup change template');
    }

    if (args.opts.template && !validate(args.opts.template)) throw new Error('invalid template');

    this.covenant = {
      namespace: args.opts.namespace,
      template: args.opts.template,
      changeTemplate: args.opts.changeTemplate,
    };
    this.ecclib = args.ecclib;
    this.masterBlindingKeyNode = SLIP77Factory(this.ecclib).fromMasterBlindingKey(
      args.opts.masterBlindingKey
    );
    this.masterPubKeyNode = BIP32Factory(this.ecclib).fromBase58(toXpub(args.opts.masterPublicKey));
  }

  private deriveMasterXPub(isChange: boolean, index: number, forSchnorr: boolean): string {
    return this.masterPubKeyNode
      .derivePath(makePath(isChange, index))
      .publicKey.slice(forSchnorr ? 1 : 0)
      .toString('hex');
  }

  private getContext(isChange: boolean, index: number): Context {
    return {
      namespaces: new Map().set(this.namespace, {
        pubkey: this.deriveMasterXPub(isChange, index, true),
      }),
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

  private cacheAddress(addr: ExtendedTaprootAddressInterface) {
    const scriptPubKey = address.toOutputScript(addr.confidentialAddress, this.network);
    this.cache.set(scriptPubKey.toString('hex'), addr);
  }

  protected getAddressByPublicKey(publicKey: string) {
    for (const addr of this.cache.values()) {
      if (addr.publicKey === publicKey) return addr;
    }
  }

  private getTemplate(isChange: boolean): string {
    if (isChange && this.covenant.changeTemplate) return this.covenant.changeTemplate;
    if (!this.covenant.template) throw new Error('template is missing');
    return this.covenant.template;
  }

  getAddress(isChange: boolean, index: number): ExtendedTaprootAddressInterface {
    const template = this.getTemplate(isChange);
    const descriptorResult = evaluate(this.getContext(isChange, index), template);
    const outputScript = descriptorResult.scriptPubKey().toString('hex');
    if (!descriptorResult.taprootHashTree) throw new Error('taprootHashTree is missing');
    return {
      ...this.outputScriptToAddressInterface(outputScript),
      result: descriptorResult,
      derivationPath: namespaceToDerivationPath(this.namespace) + '/' + makePath(isChange, index),
      publicKey: this.deriveMasterXPub(isChange, index, true), // = $test (eltr(c64....., { $test OPCHECKSIG }))
      tapscriptNeeds: analyzeTapscriptTree(descriptorResult.taprootHashTree),
    };
  }

  getNextAddress(): Promise<TaprootAddressInterface> {
    const addr = this.getAddress(false, this.index);
    this.cacheAddress(addr);
    this.index++;
    return Promise.resolve(asTaprootAddressInterface(addr));
  }

  getNextChangeAddress(): Promise<TaprootAddressInterface> {
    const addr = this.getAddress(true, this.changeIndex);
    this.cacheAddress(addr);
    this.changeIndex++;
    return Promise.resolve(asTaprootAddressInterface(addr));
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
    return Promise.resolve(Array.from(this.cache.values()).map(asTaprootAddressInterface));
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

export class CustomScriptIdentity
  extends CustomScriptIdentityWatchOnly
  implements IdentityInterface
{
  readonly masterPrivateKeyNode: Mnemonic['masterPrivateKeyNode'];
  readonly masterBlindingKeyNode: Mnemonic['masterBlindingKeyNode'];
  readonly xpub: string;

  constructor(args: IdentityOptsWithSchnorr<CustomScriptIdentityOpts>) {
    checkIdentityType(args.type, IdentityType.Mnemonic);
    checkMnemonic(args.opts.mnemonic);

    const seed = mnemonicToSeedSync(args.opts.mnemonic);
    const bip32 = BIP32Factory(args.ecclib);

    const masterPrivateKeyNode = bip32.fromSeed(seed, networks[args.chain]);
    const baseNode = makeBaseNodeFromNamespace(masterPrivateKeyNode, args.opts.namespace);

    const masterPublicKey = fromXpub(
      bip32.fromPublicKey(baseNode.publicKey, baseNode.chainCode, baseNode.network).toBase58(),
      args.chain
    );

    const masterBlindingKeyNode = SLIP77Factory(args.ecclib).fromSeed(seed);

    super({
      ...args,
      opts: {
        namespace: args.opts.namespace,
        template: args.opts.template,
        changeTemplate: args.opts.changeTemplate,
        masterPublicKey: masterPublicKey,
        masterBlindingKey: masterBlindingKeyNode.masterKey.toString('hex'),
      },
    });

    this.xpub = masterPublicKey;
    this.masterPrivateKeyNode = baseNode;
    this.masterBlindingKeyNode = masterBlindingKeyNode;
  }

  isAbleToSign(): boolean {
    return true;
  }

  private signSchnorr(derivationPath: string, msg: Buffer): Buffer {
    const signer = this.masterPrivateKeyNode.derivePath(derivationPath);
    return Buffer.from(this.ecclib.signSchnorr(msg, signer.privateKey!, Buffer.alloc(32)));
  }

  signPset(psetBase64: string): Promise<string> {
    const pset = Psbt.fromBase64(psetBase64); // we'll mutate the pset to sign with signature if needed

    // check if all inputs have witnessUtxo
    // this is needed to get prevout values and assets
    const inputsWitnessUtxos = pset.data.inputs.map((i) => i.witnessUtxo);
    const inputsUtxos = withoutUndefined(inputsWitnessUtxos);
    if (inputsUtxos.length !== inputsWitnessUtxos.length) {
      throw new Error('missing witnessUtxo, all inputs need witnessUtxo');
    }

    for (let index = 0; index < pset.txInputs.length; index++) {
      const input = pset.data.inputs[index];
      if (input.witnessUtxo) {
        const script = input.witnessUtxo.script.toString('hex');
        const cachedAddrInfos = this.cache.get(script);
        // check if we own the input
        if (cachedAddrInfos && cachedAddrInfos.result.witnesses) {
          try {
            // check if the pset signals how to spend the input
            const isKeyPath = input.tapKeySig !== undefined || input.tapMerkleRoot !== undefined;
            const isScriptPath = input.tapLeafScript !== undefined && input.tapLeafScript.length > 0;

            if (isKeyPath && isScriptPath) throw new Error('cannot spend input with both tapKeySig and tapScriptSig');

            if (isKeyPath) {
              if (input.tapKeySig !== undefined) continue; // already signed

              if (!this.hasPrivateKey(cachedAddrInfos.result.taprootInternalKey!)) {
                throw new Error('marina fails to sign input (internal key not owned by the account)');
              }

              const toSignAddress = this.getAddressByPublicKey(cachedAddrInfos.result.taprootInternalKey!);
              if (toSignAddress && toSignAddress.derivationPath) {
                const pathToPrivKey = toSignAddress.derivationPath.slice(
                  namespaceToDerivationPath(this.namespace).length + 1
                );
                const signer = this.masterPrivateKeyNode.derivePath(pathToPrivKey);
                pset.signInput(index, signer).toBase64();
                continue;
              }
            }

              const leafScript = (input.tapLeafScript && input.tapLeafScript.length > 0) 
                ? input.tapLeafScript[0].script.toString('hex') 
                : this.getFirstAutoSpendableTapscriptPath(cachedAddrInfos); 

              if (!leafScript) {
                throw new Error('marina fails to sign input (no auto spendable tapscript)');
              }

              // witnesses func will throw if the leaf is not a valid leaf
              const taprootSignScriptStack = cachedAddrInfos.result.witnesses(leafScript);
              const leafHash = bip341.tapLeafHash({
                scriptHex: leafScript,
              });

              pset.data.inputs[index].tapLeafScript = pset.data.inputs[index].tapLeafScript?.slice(1); // clear tapLeafScript first (we'll overwrite it)
              pset.updateInput(index, {
                tapLeafScript: [{ 
                  leafVersion: 0xc4, 
                  script: Buffer.from(leafScript, 'hex'), 
                  controlBlock: taprootSignScriptStack[1]
                }],
              })

              // TODO check for witness v0 (not eltr template)
              const sighashForSig = pset.TX.hashForWitnessV1(
                index,
                inputsUtxos.map((u) => u.script),
                inputsUtxos.map((u) => ({ value: u.value, asset: u.asset })),
                Transaction.SIGHASH_DEFAULT,
                this.network.genesisBlockHash,
                leafHash
              );

              const scriptNeeds = cachedAddrInfos.tapscriptNeeds[leafScript];
              if (!scriptNeeds) continue;

              for (const need of scriptNeeds.sigs) {
                const addr = this.getAddressByPublicKey(need.pubkey);
                if (addr && addr.derivationPath) {
                  const pathToPrivKey = addr.derivationPath.slice(
                    namespaceToDerivationPath(this.namespace).length + 1
                  );
                  const sig = this.signSchnorr(pathToPrivKey, sighashForSig);
                  pset.updateInput(index, {
                    tapScriptSig: [{
                      leafHash,
                      pubkey: Buffer.from(need.pubkey, 'hex'),
                      signature: sig,
                    }]
                  })
                }
              } 
          } catch (e) {
            console.warn(e);
            // we skip errors, try to sign the next input
            continue;
          }
        }
      }
    }

    return Promise.resolve(pset.toBase64());
  }

  private hasPrivateKey(pubkey: string): boolean {
    return this.getAddressByPublicKey(pubkey) !== undefined;
  }

  private getFirstAutoSpendableTapscriptPath(
    taprootAddr: ExtendedTaprootAddressInterface
  ): string | undefined {
    for (const [script, needs] of Object.entries(taprootAddr.tapscriptNeeds)) {
      if (needs.hasIntrospection || needs.needParameters) continue;
      const hasAllPrivateKeys = needs.sigs.reduce(
        (b, s) => b && this.hasPrivateKey(s.pubkey),
        true
      );
      if (hasAllPrivateKeys) return script;
    }

    return undefined;
  }
}

// restorers

export function customScriptRestorerFromEsplora<T extends CustomScriptIdentityWatchOnly>(
  toRestore: T
): Restorer<EsploraRestorerOpts, T> {
  return restorerFromEsplora(toRestore, function (isChange: boolean, index: number): string {
    return toRestore.getAddress(isChange, index).confidentialAddress;
  });
}

export function restoredCustomScriptIdentity(
  covenantDescriptors: CovenantDescriptors,
  mnemonic: string,
  network: NetworkString,
  restorerOpts: StateRestorerOpts
): Promise<CustomScriptIdentity> {
  return restorerFromState<CustomScriptIdentity>(
    new CustomScriptIdentity({
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

export function restoredCustomScriptWatchOnlyIdentity(
  covenantDescriptors: CovenantDescriptors,
  masterPublicKey: string,
  masterBlindingKey: string,
  network: NetworkString,
  restorerOpts: StateRestorerOpts
): Promise<CustomScriptIdentityWatchOnly> {
  return restorerFromState<CustomScriptIdentityWatchOnly>(
    new CustomScriptIdentityWatchOnly({
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
