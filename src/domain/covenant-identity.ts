import { AddressInterface, Identity, IdentityInterface, IdentityOpts, crypto, slip77, Mnemonic, address, Psbt, restorerFromEsplora, Restorer, EsploraRestorerOpts, IdentityType, NetworkString, restorerFromState, StateRestorerOpts } from "ldk";
import type { BlindingDataLike } from "liquidjs-lib/src/psbt";
import { evaluate } from "../descriptors";
import { Result } from "../descriptors/ast";
import { Context } from "../descriptors/preprocessing";

// slip13: https://github.com/satoshilabs/slips/blob/master/slip-0013.md#hd-structure
function namespaceToDerivationPath(namespace: string): string {
    const hash = crypto.sha256(Buffer.from(namespace));
    const hash128 = hash.slice(0, 16);
    const A = hash128.readUint32LE(0)
    const B = hash128.readUint32LE(4)
    const C = hash128.readUint32LE(8)
    const D = hash128.readUint32LE(12)
    return `m/13'/${A}'/${B}'/${C}'/${D}'`
}

export interface TaprootAddressInterface extends AddressInterface {
    result: Result;
}

export interface CovenantDescriptors {
    namespace: string;
    template: string;
}

export type TemplateIdentityOpts = CovenantDescriptors & {
    mnemonic: string;
}

export type TemplateIdentityWatchOnlyOpts = CovenantDescriptors & {
    masterBlindingKey: string;
    masterPublicKey: string;
}

function validateTemplateELTR(template: string) {
    if (!template.startsWith("eltr")) {
        throw new Error(`template does not start with eltr descriptor: ${template}`);
    }
}

interface SignTaprootLeafOpts {
    leafScript: string;
    inputs: Buffer[];
}

export class CovenantIdentityWatchOnly extends Identity implements IdentityInterface {
    private index = 0;
    private changeIndex = 0;
    protected cache = new Map<string, TaprootAddressInterface>();
    readonly masterBlindingKeyNode: Mnemonic['masterBlindingKeyNode'];
    readonly xpub: string;
    template: string;

    constructor(args: IdentityOpts<TemplateIdentityWatchOnlyOpts>) {
        super(args);
        validateTemplateELTR(args.opts.template);
        this.template = args.opts.template;
        this.masterBlindingKeyNode = slip77.fromMasterBlindingKey(args.opts.masterBlindingKey);
        this.xpub = args.opts.masterPublicKey;
    }

    private getContext(isChange: boolean, index: number): Context {
        return {
            xpubs: new Map<string, { derivationPath: string }>()
                .set(this.xpub, { derivationPath: `${isChange ? 1 : 0}/${index}` })
        }
    }

    protected getBlindingKeyPair(scriptPubKey: string, checkScript = false): { publicKey: Buffer; privateKey: Buffer } {
        if (checkScript && !this.cache.has(scriptPubKey)) throw new Error(`unknow blinding key for script ${scriptPubKey}`);
        const { publicKey, privateKey } = this.masterBlindingKeyNode.derive(scriptPubKey);
        return { publicKey: publicKey!, privateKey: privateKey! };
    }

    private cacheAddress(addr: TaprootAddressInterface) {
        const scriptPubKey = address.toOutputScript(addr.confidentialAddress, this.network);
        this.cache.set(scriptPubKey.toString('hex'), addr);
    }

    getAddress(isChange: boolean, index: number): TaprootAddressInterface {
        const descriptorResult = evaluate(this.getContext(isChange, index), this.template);
        const outputScript = descriptorResult.scriptPubKey().toString('hex');
        if (!descriptorResult.taprootHashTree)
            throw new Error("taprootHashTree is missing");
        const addr = { ...this.outputScriptToAddressInterface(outputScript), result: descriptorResult };
        return addr;
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
        const unconfidentialAddress = address.fromOutputScript(Buffer.from(outputScript, 'hex'), this.network);
        const confidentialAddress = address.toConfidential(unconfidentialAddress, blindingKeyPair.publicKey);
        return {
            confidentialAddress,
            blindingPrivateKey: blindingKeyPair.privateKey.toString('hex'),
        };
    }

    signPset(_: string, __: SignTaprootLeafOpts): Promise<string> {
        throw new Error("watch only identity");
    }

    getAddresses(): Promise<TaprootAddressInterface[]> {
        return Promise.resolve(Array.from(this.cache.values()));
    }

    getBlindingPrivateKey(script: string): Promise<string> {
        return Promise.resolve(this.getBlindingKeyPair(script).privateKey.toString('hex'));
    }

    blindPset(psetBase64: string, outputsIndexToBlind: number[], outputsPubKeysByIndex?: Map<number, string>, inputsBlindingDataLike?: Map<number, BlindingDataLike>): Promise<string> {
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


export class CovenantIdentity extends CovenantIdentityWatchOnly implements IdentityInterface {
    readonly masterPrivateKeyNode: Mnemonic['masterPrivateKeyNode'];
    readonly masterBlindingKeyNode: Mnemonic['masterBlindingKeyNode'];

    public masterPublicKey: string;
    public masterBlindingKey: string;

    constructor(args: IdentityOpts<TemplateIdentityOpts>) {
        // we use mnemonic identity to build the bip32 & slip77 nodes
        const mnemonic = new Mnemonic({
            ...args,
            opts: {
                mnemonic: args.opts.mnemonic,
                baseDerivationPath: namespaceToDerivationPath(args.opts.namespace),
            }
        })

        super({
            ...args,
            opts: {
                namespace: args.opts.namespace,
                template: args.opts.template,
                masterPublicKey: mnemonic.masterPublicKey,
                masterBlindingKey: mnemonic.masterBlindingKey,
            }
        });

        this.masterPrivateKeyNode = mnemonic.masterPrivateKeyNode;
        this.masterBlindingKeyNode = mnemonic.masterBlindingKeyNode;
        this.masterPublicKey = mnemonic.masterPublicKey;
        this.masterBlindingKey = mnemonic.masterBlindingKey;
    }

    isAbleToSign(): boolean {
        return true;
    }

    signPset(psetBase64: string, signTaprootLeafOpts: SignTaprootLeafOpts): Promise<string> {
        const pset = Psbt.fromBase64(psetBase64);

        for (let index = 0; index < pset.data.inputs.length; index++) {
            const input = pset.data.inputs[index];
            if (input.witnessUtxo) {
                const script = input.witnessUtxo.script.toString('hex');
                const cachedAddrInfos = this.cache.get(script);
                if (cachedAddrInfos && cachedAddrInfos.result.witnesses) {
                    try {
                        const witnessStack = [...signTaprootLeafOpts.inputs, ...cachedAddrInfos.result.witnesses(signTaprootLeafOpts.leafScript)]
                        const signedPset = pset.updateInput(index, { finalScriptWitness: Buffer.concat(witnessStack) }).toBase64();
                        return Promise.resolve(signedPset);
                    } catch (e) {
                        console.log(e);
                        continue;
                    }
                }
            }
        }

        return Promise.reject(new Error("no input to sign with leaf found"));
    }
}

// restorers

export function covenantRestorerFromEsplora<T extends CovenantIdentityWatchOnly>(toRestore: T): Restorer<EsploraRestorerOpts, T> {
    return restorerFromEsplora(toRestore, function (isChange: boolean, index: number): string {
        return toRestore.getAddress(isChange, index).confidentialAddress;
    })
}

export function restoredCovenantIdentity(covenantDescriptors: CovenantDescriptors, mnemonic: string, network: NetworkString, restorerOpts: StateRestorerOpts): Promise<CovenantIdentity> {
    return restorerFromState<CovenantIdentity>(
        new CovenantIdentity({
            type: IdentityType.Mnemonic,
            chain: network,
            opts: {
                ...covenantDescriptors,
                mnemonic,
            }
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
            opts: {
                ...covenantDescriptors,
                masterPublicKey,
                masterBlindingKey,
            }
        })
    )(restorerOpts);
}