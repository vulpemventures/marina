import * as ecc from 'tiny-secp256k1';
import type { BIP32Interface } from 'bip32';
import { BIP32Factory } from 'bip32';
import {
  Pset,
  Signer,
  Transaction,
  script as bscript,
  Finalizer,
  Extractor,
  bip341 as bip341lib,
  networks,
  Updater,
} from 'liquidjs-lib';
import { mnemonicToSeed } from 'bip39';
import type { AppRepository, WalletRepository } from '../infrastructure/repository';
import { decrypt } from '../encryption';
import { Contract, H_POINT } from '@ionio-lang/ionio';
import { analyzeTapscriptTree } from './script-analyser';
import { AccountType, isIonioScriptDetails } from 'marina-provider';
import { h2b } from '../utils';

const bip32 = BIP32Factory(ecc);
const bip341 = bip341lib.BIP341Factory(ecc);

export class SignerService {
  private constructor(
    private walletRepository: WalletRepository,
    private appRepository: AppRepository,
    private masterNode: BIP32Interface
  ) {}

  static async fromPassword(walletRepository: WalletRepository, appRepository: AppRepository, password: string) {
    const encrypted = await walletRepository.getEncryptedMnemonic();
    if (!encrypted) throw new Error('No mnemonic found in wallet');
    const decryptedMnemonic = await decrypt(encrypted, password);
    const masterNode = bip32.fromSeed(await mnemonicToSeed(decryptedMnemonic));
    return new SignerService(walletRepository, appRepository, masterNode);
  }

  async signPset(pset: Pset): Promise<Pset> {
    const inputsScripts = pset.inputs
      .map((input) => input.witnessUtxo?.script)
      .filter((script) => !!script);
    const scriptsDetails = await this.walletRepository.getScriptDetails(
      ...inputsScripts.map((script) => script!.toString('hex'))
    );

    const accounts = await this.walletRepository.getAccountDetails();

    const signer = new Signer(pset);
    for (const [index, input] of signer.pset.inputs.entries()) {
      const script = input.witnessUtxo?.script;
      if (!script) continue;
      const scriptDetails = scriptsDetails[script.toString('hex')];
      if (!scriptDetails || !scriptDetails.derivationPath) continue;
      const inputAccount = accounts[scriptDetails.accountName]!;

      const network = await this.appRepository.getNetwork();
      if (!network) throw new Error('No network found');

      const key = this.masterNode
        .derivePath(inputAccount.baseDerivationPath)
        .derivePath(scriptDetails.derivationPath.replace('m/', '')!);

      switch (inputAccount.type) {
        case AccountType.P2WPKH: {
          const sighash = input.sighashType || Transaction.SIGHASH_ALL; // '||' lets to overwrite SIGHASH_DEFAULT (0x00)
          const signature = key.sign(pset.getInputPreimage(index, sighash));

          signer.addSignature(
            index,
            {
              partialSig: {
                pubkey: key.publicKey,
                signature: bscript.signature.encode(signature, sighash),
              },
            },
            Pset.ECDSASigValidator(ecc)
          );
          break;
        }
        case AccountType.Ionio: {
          if (!isIonioScriptDetails(scriptDetails)) throw new Error('Invalid script details');
          const { artifact, params } = scriptDetails;
          const isScriptPath = input.tapLeafScript && input.tapLeafScript.length > 0;
          // if no path is specified, we search for a leaf with only marina sig needed
          // if we found it, update the tapLeafScript input field
          if (!isScriptPath) {
            const contract = new Contract(artifact, params, networks[network], {
              ecc,
              zkp: await require('@vulpemventures/secp256k1-zkp')(),
            });
            const taprootTree = contract.getTaprootTree();
            const needs = analyzeTapscriptTree(taprootTree);
            const autospendableLeafScripts = Object.entries(needs)
              .filter(([, scriptNeeds]) => {
                if (scriptNeeds.hasIntrospection || scriptNeeds.needParameters) return false;
                return (
                  scriptNeeds.sigs.length === 1 &&
                  h2b(scriptNeeds.sigs[0].pubkey).equals(key.publicKey.subarray(1))
                );
              })
              .map(([script]) => script);

            const updater = new Updater(pset);
            for (const leafScript of autospendableLeafScripts) {
              const leafHash = bip341lib.tapLeafHash({ scriptHex: leafScript });
              const controlBlock = bip341.taprootSignScriptStack(
                H_POINT,
                { scriptHex: leafScript },
                taprootTree.hash,
                bip341lib.findScriptPath(taprootTree, leafHash)
              )[1];
              updater.addInTapLeafScript(index, {
                controlBlock,
                leafVersion: bip341lib.LEAF_VERSION_TAPSCRIPT,
                script: Buffer.from(leafScript),
              });
            }
          }

          for (const leaf of input.tapLeafScript || []) {
            const leafHash = bip341lib.tapLeafHash({
              scriptHex: leaf.script.toString('hex'),
              version: leaf.leafVersion,
            });
            const sighash = input.sighashType ?? Transaction.SIGHASH_DEFAULT;
            const preimage = signer.pset.getInputPreimage(
              index,
              sighash,
              networks[network].genesisBlockHash,
              leafHash
            );

            const signature = Buffer.from(
              ecc.signSchnorr(preimage, key.privateKey!, Buffer.alloc(32))
            );
            signer.addSignature(
              index,
              {
                genesisBlockHash: networks[network].genesisBlockHash,
                tapScriptSigs: [
                  {
                    leafHash,
                    pubkey: key.publicKey.subarray(1),
                    signature,
                  },
                ],
              },
              Pset.SchnorrSigValidator(ecc)
            );
          }

          break;
        }
        default:
          throw new Error('Unsupported account type');
      }
    }
    return signer.pset;
  }

  finalizeAndExtract(pset: Pset): string {
    const finalizer = new Finalizer(pset);
    finalizer.finalize();
    return Extractor.extract(finalizer.pset).toHex();
  }
}
