import * as ecc from 'tiny-secp256k1';
import zkpLib from '@vulpemventures/secp256k1-zkp';
import type { BIP32Interface } from 'bip32';
import { BIP32Factory } from 'bip32';
import {
  Pset,
  Signer,
  Transaction,
  script as bscript,
  Finalizer,
  Extractor,
  bip341,
  networks,
  Updater,
  payments,
} from 'liquidjs-lib';
import { mnemonicToSeed } from 'bip39';
import type { AppRepository, WalletRepository } from '../domain/repository';
import { decrypt } from '../domain/encryption';
import { Contract, H_POINT } from '@ionio-lang/ionio';
import { analyzeTapscriptTree } from '../pkg/script-analyser';
import { AccountType, isIonioScriptDetails } from 'marina-provider';
import { h2b } from './utils';

const bip32 = BIP32Factory(ecc);

export class SignerService {
  private constructor(
    private walletRepository: WalletRepository,
    private appRepository: AppRepository,
    private masterNode: BIP32Interface
  ) {}

  static async fromPassword(
    walletRepository: WalletRepository,
    appRepository: AppRepository,
    password: string
  ) {
    const encrypted = await walletRepository.getEncryptedMnemonic();
    if (!encrypted) throw new Error('No mnemonic found in wallet');
    const decryptedMnemonic = await decrypt(encrypted, password);
    const masterNode = bip32.fromSeed(await mnemonicToSeed(decryptedMnemonic));
    return new SignerService(walletRepository, appRepository, masterNode);
  }

  async signPset(pset: Pset): Promise<Pset> {
    const network = await this.appRepository.getNetwork();
    if (!network) throw new Error('No network found');

    const inputsScripts = pset.inputs
      .flatMap((input) => [
        input.witnessUtxo?.script,
        extractScriptFromBIP32Derivation(input, networks[network]),
      ])
      .filter((script) => !!script);

    const scriptsDetails = await this.walletRepository.getScriptDetails(
      ...inputsScripts.map((script) => script!.toString('hex'))
    );

    const accounts = await this.walletRepository.getAccountDetails();

    const signer = new Signer(pset);
    for (const [index, input] of signer.pset.inputs.entries()) {
      if (!input.witnessUtxo && !input.nonWitnessUtxo) continue;
      const scriptFromDerivation = extractScriptFromBIP32Derivation(input, networks[network]);
      if (!scriptFromDerivation && !input.witnessUtxo) continue;
      const scriptDetails = scriptFromDerivation
        ? scriptsDetails[scriptFromDerivation?.toString('hex')]
        : scriptsDetails[input.witnessUtxo!.script.toString('hex')];
      if (!scriptDetails || !scriptDetails.derivationPath) continue;
      const inputAccount = accounts[scriptDetails.accountName]!;

      const key = this.masterNode
        .derivePath(inputAccount.baseDerivationPath)
        .derivePath(scriptDetails.derivationPath.replace('m/', '')!);

      switch (inputAccount.type) {
        case AccountType.P2WPKH: {
          const sighash = input.sighashType || Transaction.SIGHASH_ALL; // '||' lets to overwrite SIGHASH_DEFAULT (0x00)
          const signature = key.sign(pset.getInputPreimage(index, sighash));
          const ecc = (await zkpLib()).ecc;
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
            const zkp = await zkpLib();
            const contract = new Contract(artifact, params, networks[network], zkp);
            const taprootTree = contract.taprootTree;
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
              const leafHash = bip341.tapLeafHash({ scriptHex: leafScript });
              const controlBlock = bip341
                .BIP341Factory(zkp.ecc)
                .taprootSignScriptStack(
                  H_POINT,
                  { scriptHex: leafScript },
                  taprootTree.hash,
                  bip341.findScriptPath(taprootTree, leafHash)
                )[1];
              updater.addInTapLeafScript(index, {
                controlBlock,
                leafVersion: bip341.LEAF_VERSION_TAPSCRIPT,
                script: Buffer.from(leafScript),
              });
            }
          }

          for (const leaf of input.tapLeafScript || []) {
            const leafHash = bip341.tapLeafHash({
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
              Pset.SchnorrSigValidator((await zkpLib()).ecc)
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

// extract p2wpkh scriptPubKey from the first derivation path found in the input
function extractScriptFromBIP32Derivation(
  input: Pset['inputs'][number],
  network: networks.Network
): Buffer | undefined {
  const derivation = input.bip32Derivation?.at(0);
  if (!derivation) return;
  return createP2WKHScript(derivation.pubkey, network);
}

function createP2WKHScript(publicKey: Buffer, network: networks.Network): Buffer {
  const buf = payments.p2wpkh({ pubkey: publicKey, network: network }).output;
  if (!buf) throw new Error('Could not create p2wpkh script');
  return buf;
}
