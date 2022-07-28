import {
  Identity,
  crypto,
  address,
  Psbt,
  IdentityType,
  Transaction,
  bip341,
  toXpub,
  checkIdentityType,
  checkMnemonic,
  networks,
  fromXpub,
  analyzeTapscriptTree,
} from 'ldk';
import type {
  AddressInterface,
  IdentityInterface,
  IdentityOpts,
  Restorer,
  NetworkString,
  Mnemonic,
  ScriptInputsNeeds,
} from 'ldk';
import type { BlindingDataLike } from 'liquidjs-lib/src/psbt';
import { SLIP77Factory } from 'slip77';
import * as ecc from 'tiny-secp256k1';
import type { BIP32Interface } from 'bip32';
import BIP32Factory from 'bip32';
import { mnemonicToSeedSync } from 'bip39';
import type { Argument, Artifact } from '@ionio-lang/ionio';
import {
  H_POINT,
  Contract,
  replaceArtifactConstructorWithArguments,
  toDescriptor,
} from '@ionio-lang/ionio';

// slip13: https://github.com/satoshilabs/slips/blob/master/slip-0013.md#hd-structure
function namespaceToDerivationPath(namespace: string): string {
  const hash = crypto.sha256(Buffer.from(namespace));
  const hash128 = hash.subarray(0, 16);
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

// ExtendedTaprootAddressInterface is not the exported interface of the identity
// TaprootAddressInterface is the "public" version of address objects
interface ExtendedTaprootAddressInterface extends AddressInterface {
  descriptor: string;
  constructorParams?: Record<string, string | number>;
  // below are only used internaly
  contract: Contract;
  tapscriptNeeds: Record<string, ScriptInputsNeeds>; // scripthex -> needs
}

export type TaprootAddressInterface = AddressInterface &
  Omit<ExtendedTaprootAddressInterface, 'contract' | 'tapscriptNeeds'>;

export function isTaprootAddressInterface(
  address: AddressInterface
): address is TaprootAddressInterface {
  return 'descriptor' in address;
}

function asTaprootAddressInterface(
  extended: ExtendedTaprootAddressInterface
): TaprootAddressInterface {
  return {
    confidentialAddress: extended.confidentialAddress,
    blindingPrivateKey: extended.blindingPrivateKey,
    derivationPath: extended.derivationPath,
    publicKey: extended.publicKey,
    descriptor: extended.descriptor,
    contract: extended.contract,
    constructorParams: extended.constructorParams,
  };
}

export interface ContractTemplate {
  namespace: string;
  template?: string;
  isSpendableByMarina?: boolean;
}

export type CustomScriptIdentityOpts = ContractTemplate & {
  mnemonic: string;
};

export type TemplateIdentityWatchOnlyOpts = ContractTemplate & {
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
  readonly contract: ContractTemplate;
  readonly ecclib: IdentityOpts<any>['ecclib'] & bip341.TinySecp256k1Interface;

  constructor(args: IdentityOptsWithSchnorr<TemplateIdentityWatchOnlyOpts>) {
    super(args);

    if (args.opts.namespace.length === 0) throw new Error('namespace is required');
    this.namespace = args.opts.namespace;

    if (args.opts.template && !validateTemplate(args.opts.template))
      throw new Error('invalid template');

    this.contract = {
      namespace: args.opts.namespace,
      template: args.opts.template,
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

  getAddress(
    isChange: boolean,
    index: number,
    constructorParams?: Record<string, string | number>
  ): ExtendedTaprootAddressInterface {
    if (!this.contract.template) {
      throw new Error('missing template');
    }
    const template = this.contract.template;
    const artifact = JSON.parse(template) as Artifact;
    const publicKey = this.deriveMasterXPub(isChange, index, true);

    if (!constructorParams) {
      constructorParams = {} as Record<string, string | number>;
    }
    constructorParams[this.namespace] = '0x'.concat(publicKey);
    const constructorArgs: Argument[] = artifact.constructorInputs.map(({ name }) => {
      const param = constructorParams![name];
      if (!param) {
        throw new Error(`missing contructor arg ${name}`);
      }
      return param;
    });

    const contract = new Contract(artifact, constructorArgs, this.network, ecc);
    const outputScript = contract.scriptPubKey;
    return {
      ...this.outputScriptToAddressInterface(outputScript.toString('hex')),
      publicKey,
      contract,
      derivationPath: namespaceToDerivationPath(this.namespace) + '/' + makePath(isChange, index),
      tapscriptNeeds: analyzeTapscriptTree(contract.getTaprootTree()),
      descriptor: toDescriptor(replaceArtifactConstructorWithArguments(artifact, constructorArgs)),
      constructorParams,
    };
  }

  getNextAddress(
    constructorParams?: Record<string, string | number>
  ): Promise<TaprootAddressInterface> {
    const addr = this.getAddress(false, this.index, constructorParams);
    this.cacheAddress(addr);
    this.index++;
    return Promise.resolve(asTaprootAddressInterface(addr));
  }

  getNextChangeAddress(
    constructorParams?: Record<string, string | number>
  ): Promise<TaprootAddressInterface> {
    const addr = this.getAddress(true, this.changeIndex, constructorParams);
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

  /**
   * 1. marina don't know the leaf to use
   *    1.a marina try to find an auto-spendable leaf (= leaf with only marina signature needed)
   *    1.b go to 2.a
   * 2. marina knwows the leaf to use (via psbt taproot field tapLeafScript)
   *    2.a if the leaf contains marina signature -> sign and add tapLeafSig to input
   *    2.b if the leaf doesn't contain marina signature -> skip
   */
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
        if (cachedAddrInfos) {
          try {
            // check if the pset signals how to spend the input
            const isKeyPath = input.tapKeySig !== undefined || input.tapMerkleRoot !== undefined;
            const isScriptPath =
              input.tapLeafScript !== undefined && input.tapLeafScript.length > 0;

            if (isKeyPath && isScriptPath)
              throw new Error('cannot spend input with both tapKeySig and tapScriptSig');

            if (isKeyPath) {
              if (input.tapKeySig !== undefined) continue; // already signed

              // ionio contracts always use H_POINT as internal key
              const internalPubKey = H_POINT.toString('hex');

              if (!this.hasPrivateKey(internalPubKey)) {
                throw new Error(
                  'marina fails to sign input (internal key not owned by the account)'
                );
              }

              const toSignAddress = this.getAddressByPublicKey(internalPubKey);
              if (toSignAddress && toSignAddress.derivationPath) {
                const pathToPrivKey = toSignAddress.derivationPath.slice(
                  namespaceToDerivationPath(this.namespace).length + 1
                );
                const signer = this.masterPrivateKeyNode.derivePath(pathToPrivKey);
                pset.signInput(index, signer).toBase64();
                continue;
              }
            }

            let leafScript = undefined;
            if (input.tapLeafScript && input.tapLeafScript.length > 0) {
              leafScript = input.tapLeafScript[0].script.toString('hex');
            } else {
              leafScript = this.getFirstAutoSpendableTapscriptPath(cachedAddrInfos);
              cachedAddrInfos.contract.getTaprootTree();
              // if we use the auto-spendable leaf we need to add the tapLeafScript to the input
              if (leafScript) {
                const tree = cachedAddrInfos.contract.getTaprootTree();
                const leaf = { scriptHex: leafScript };
                const leafHash = bip341.tapLeafHash(leaf);

                // witnesses func will throw if the leaf is not a valid leaf
                const taprootSignScriptStack = bip341
                  .BIP341Factory(this.ecclib)
                  .taprootSignScriptStack(
                    H_POINT,
                    { scriptHex: leafScript },
                    tree.hash,
                    bip341.findScriptPath(tree, leafHash)
                  );

                pset.updateInput(index, {
                  tapLeafScript: [
                    {
                      leafVersion: 0xc4, // elements tapscript version
                      script: Buffer.from(leafScript, 'hex'),
                      controlBlock: taprootSignScriptStack[1],
                    },
                  ],
                });
              }
            }

            if (!leafScript) {
              throw new Error('marina fails to sign input (no auto spendable tapscript)');
            }

            const leaf = { scriptHex: leafScript };
            const leafHash = bip341.tapLeafHash(leaf);

            const sighash = pset.data.inputs[index].sighashType || Transaction.SIGHASH_DEFAULT;

            const sighashForSig = pset.TX.hashForWitnessV1(
              index,
              inputsUtxos.map((u) => u.script),
              inputsUtxos.map((u) => ({ value: u.value, asset: u.asset })),
              sighash,
              this.network.genesisBlockHash,
              leafHash
            );

            const scriptNeeds = cachedAddrInfos.tapscriptNeeds[leafScript];
            if (!scriptNeeds) continue;

            for (const need of scriptNeeds.sigs) {
              const addr = this.getAddressByPublicKey(need.pubkey);
              if (addr && addr.derivationPath) {
                const pathToPrivKey = addr.derivationPath.slice(
                  namespaceToDerivationPath(this.namespace).length + 1 // remove base derivation path
                );
                const sig = this.signSchnorr(pathToPrivKey, sighashForSig);
                pset.updateInput(index, {
                  tapScriptSig: [
                    {
                      leafHash,
                      pubkey: Buffer.from(need.pubkey, 'hex'),
                      signature: sig,
                    },
                  ],
                });
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

export function restoredCustomScriptIdentity(
  contractTemplate: ContractTemplate,
  mnemonic: string,
  network: NetworkString,
  restorerOpts: CustomRestorerOpts
): Promise<CustomScriptIdentity> {
  return customRestorerFromState<CustomScriptIdentity>(
    new CustomScriptIdentity({
      type: IdentityType.Mnemonic,
      chain: network,
      ecclib: ecc,
      opts: {
        ...contractTemplate,
        mnemonic,
      },
    })
  )(restorerOpts);
}

export function restoredCustomScriptWatchOnlyIdentity(
  contractTemplate: ContractTemplate,
  masterPublicKey: string,
  masterBlindingKey: string,
  network: NetworkString,
  restorerOpts: CustomRestorerOpts
): Promise<CustomScriptIdentityWatchOnly> {
  return customRestorerFromState<CustomScriptIdentityWatchOnly>(
    new CustomScriptIdentityWatchOnly({
      type: IdentityType.MasterPublicKey,
      chain: network,
      ecclib: ecc,
      opts: {
        ...contractTemplate,
        masterPublicKey,
        masterBlindingKey,
      },
    })
  )(restorerOpts);
}

function makePath(isChange: boolean, index: number): string {
  return `${isChange ? 1 : 0}/${index}`;
}

function validateTemplate(template: string): boolean {
  const artifact = JSON.parse(template) as Artifact;
  const expectedProperties = ['contractName', 'functions', 'constructorInputs'];
  return expectedProperties.every((property) => property in artifact);
}

export interface CustomRestorerOpts {
  lastUsedExternalIndex: number;
  lastUsedInternalIndex: number;
  customParamsByIndex: Record<number, Record<string, string | number>>;
  customParamsByChangeIndex: Record<number, Record<string, string | number>>;
}

function customRestorerFromState<R extends CustomScriptIdentityWatchOnly>(
  identity: R
): Restorer<CustomRestorerOpts, R> {
  return async ({
    lastUsedExternalIndex,
    lastUsedInternalIndex,
    customParamsByIndex,
    customParamsByChangeIndex,
  }) => {
    const promises = [];

    if (lastUsedExternalIndex !== undefined) {
      for (let i = 0; i <= lastUsedExternalIndex; i++) {
        const params = customParamsByIndex[i];
        const promise = identity.getNextAddress(params);
        promises.push(promise);
      }
    }

    if (lastUsedInternalIndex !== undefined) {
      for (let i = 0; i <= lastUsedInternalIndex; i++) {
        const params = customParamsByChangeIndex[i];
        const promise = identity.getNextChangeAddress(params);
        promises.push(promise);
      }
    }

    await Promise.all(promises);

    return identity;
  };
}
