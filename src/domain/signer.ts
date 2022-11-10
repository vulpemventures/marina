import * as ecc from "tiny-secp256k1";
import { BIP32Factory, BIP32Interface } from "bip32";
import { Pset, Signer, Transaction, script as bscript, Finalizer, Extractor } from "liquidjs-lib";
import { mnemonicToSeed } from "bip39";
import { WalletRepository } from "../infrastructure/repository";
import { hashPassword, decrypt } from "../utils";

const bip32 = BIP32Factory(ecc);
const sigValidator = Pset.ECDSASigValidator(ecc);

export class SignerService {
    private constructor(private walletRepository: WalletRepository, private masterNode: BIP32Interface) { }

    static async fromPassword(walletRepository: WalletRepository, password: string) {
        const passwordHash = await walletRepository.getPasswordHash();
        if (hashPassword(password) !== passwordHash) throw new Error('Invalid password');
        const encrypted = await walletRepository.getEncryptedMnemonic();
        if (!encrypted) throw new Error('No mnemonic found in wallet')
        const decryptedMnemonic = decrypt(encrypted, password);
        const masterNode = bip32.fromSeed(await mnemonicToSeed(decryptedMnemonic));
        return new SignerService(walletRepository, masterNode);
    }

    async signPset(psetBase64: string): Promise<string> {
        const pset = Pset.fromBase64(psetBase64);
        const inputsScripts = pset.inputs.map(input => input.witnessUtxo?.script).filter(script => !!script);
        const scriptsDetails = await this.walletRepository.getScriptDetails(...inputsScripts.map(script => script!.toString('hex')));

        // get the base account path
        const accountPath = new Map<string, string>();
        const allAccounts = await this.walletRepository.getAccountDetails()
        for (const [accountName, details] of Object.entries(allAccounts)) {
            accountPath.set(accountName, details.baseDerivationPath);
        }

        const signer = new Signer(pset);
        for (const [index, input] of signer.pset.inputs.entries()) {
            const script = input.witnessUtxo?.script;
            if (!script) continue;
            const scriptDetails = scriptsDetails[script.toString('hex')];
            if (!scriptDetails) continue;
            const key = this.masterNode
                .derivePath(accountPath.get(scriptDetails.accountName)!)
                .derivePath(scriptDetails.derivationPath?.replace('m/', '')!)

            const sighash = input.sighashType || Transaction.SIGHASH_ALL;
            const signature = key
                .sign(pset.getInputPreimage(index, sighash));
            
            signer.addSignature(index, {
                partialSig: {
                    pubkey: key.publicKey,
                    signature: bscript.signature.encode(signature, sighash)
                }
            }, sigValidator)
        }

        return signer.pset.toBase64();
    }

    async finalizeAndExtract(psetBase64: string): Promise<string> {
        const pset = Pset.fromBase64(psetBase64);
        const finalizer = new Finalizer(pset);
        finalizer.finalize();
        return Extractor.extract(finalizer.pset).toHex();
    }
}