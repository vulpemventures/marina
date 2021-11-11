import {
  DEFAULT_BASE_DERIVATION_PATH,
  HDSignerMultisig,
  IdentityInterface,
  IdentityType,
  MasterPublicKey,
  Mnemonic,
  Multisig,
  MultisigWatchOnly,
  StateRestorerOpts,
  XPub,
  multisigFromEsplora,
  Restorer,
  EsploraRestorerOpts,
  masterPubKeyRestorerFromEsplora,
  multisigWatchOnlyFromEsplora,
} from 'ldk';
import { decrypt } from '../application/utils';
import {
  getStateRestorerOptsFromAddresses,
  newMasterPublicKey,
  newMultisigWatchOnly,
  restoredMasterPublicKey,
  restoredMnemonic,
  restoredMultisig,
  restoredWatchOnlyMultisig,
} from '../application/utils/restorer';
import { MockedCosigner, MultisigWithCosigner } from './cosigner';
import { EncryptedMnemonic } from './encrypted-mnemonic';
import { MasterBlindingKey } from './master-blinding-key';
import { MasterXPub } from './master-extended-pub';
import { Network } from './network';
import { CosignerExtraData } from './wallet';

export const MainAccountID = 'mainAccount';
export const RestrictedAssetAccountID = 'restrictedAssetAccount';

export type AccountID = 'mainAccount' | 'restrictedAssetAccount';

/**
 * Account domain represents the keys of the User
 *
 * - each Account is a derived of master private key (computed from mnemonic).
 * - an Account returns two types of identities: a WatchOnly identity and a signing Identity.
 *    the watch-only identity is used to update utxos and transactions state
 *    the signing identity is used to sign inputs. it needs the user's password to decrypt the mnemonic.
 */
export interface Account<
  SignID extends IdentityInterface = IdentityInterface,
  WatchID extends IdentityInterface = IdentityInterface
> {
  getAccountID(): AccountID;
  getSigningIdentity(password: string): Promise<SignID>;
  getWatchIdentity(): Promise<WatchID>;
  getDeepRestorer(): Restorer<EsploraRestorerOpts, WatchID>;
}

// Main Account uses the default Mnemonic derivation path
// single-sig account used to send/receive regular assets
export type MnemonicAccount = Account<Mnemonic, MasterPublicKey>;

export interface MnemonicAccountData {
  encryptedMnemonic: EncryptedMnemonic;
  restorerOpts: StateRestorerOpts;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

export function createMnemonicAccount(
  data: MnemonicAccountData,
  network: Network
): MnemonicAccount {
  return {
    getAccountID: () => MainAccountID,
    getSigningIdentity: (password: string) =>
      restoredMnemonic(decrypt(data.encryptedMnemonic, password), data.restorerOpts, network),
    getWatchIdentity: () =>
      restoredMasterPublicKey(data.masterXPub, data.masterBlindingKey, data.restorerOpts, network),
    getDeepRestorer: () =>
      masterPubKeyRestorerFromEsplora(
        newMasterPublicKey(data.masterXPub, data.masterBlindingKey, network)
      ),
  };
}

// MultisigAccount aims to handle account with cosigner(s)
// use master extended public keys from cosigners and xpub derived from master private key (mnemonic)
export type MultisigAccount = Account<MultisigWithCosigner, MultisigWatchOnly>;

export interface MultisigAccountData<ExtraDataT = undefined> {
  baseDerivationPath: string; // we'll use the MainAccount in order to generate
  signerXPub: XPub;
  cosignerXPubs: XPub[];
  restorerOpts: StateRestorerOpts;
  requiredSignature: number;
  extraData: ExtraDataT;
  network: Network;
}

// create account data
// restore the Identity from esplora URL in order to compute the StateRestorerOpts
export async function create2of2MultisigAccountData<T>(
  signer: HDSignerMultisig,
  cosignerXPub: XPub,
  network: Network,
  extraData: T,
  explorerURL: string
): Promise<MultisigAccountData<T>> {
  const multisigID = new Multisig({
    chain: network,
    type: IdentityType.Multisig,
    opts: {
      requiredSignatures: 2,
      signer,
      cosigners: [cosignerXPub],
    },
  });

  const restoredFromExplorer = await multisigFromEsplora(multisigID)({
    esploraURL: explorerURL,
    gapLimit: 30,
  });
  const addresses = await restoredFromExplorer.getAddresses();
  const restorerOpts = getStateRestorerOptsFromAddresses(addresses);

  return {
    baseDerivationPath: signer.baseDerivationPath || DEFAULT_BASE_DERIVATION_PATH,
    signerXPub: multisigID.getXPub(),
    cosignerXPubs: [cosignerXPub],
    requiredSignature: 2,
    extraData,
    restorerOpts,
    network,
  };
}

export function createMultisigAccount(
  encryptedMnemonic: EncryptedMnemonic,
  data: MultisigAccountData<CosignerExtraData>
): MultisigAccount {
  return {
    getAccountID: () => RestrictedAssetAccountID,
    getSigningIdentity: (password: string) =>
      restoredMultisig(
        {
          mnemonic: decrypt(encryptedMnemonic, password),
          baseDerivationPath: data.baseDerivationPath,
        },
        data.cosignerXPubs,
        data.requiredSignature,
        data.restorerOpts,
        new MockedCosigner(data.network),
        data.network
      ),
    getWatchIdentity: () =>
      restoredWatchOnlyMultisig(
        data.signerXPub,
        data.cosignerXPubs,
        data.requiredSignature,
        data.restorerOpts,
        data.network
      ),
    getDeepRestorer: () =>
      multisigWatchOnlyFromEsplora(
        newMultisigWatchOnly(
          data.network,
          data.requiredSignature,
          data.cosignerXPubs,
          data.signerXPub
        )
      ),
  };
}
