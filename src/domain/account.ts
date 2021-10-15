import { IdentityInterface, MasterPublicKey, Mnemonic, Multisig, MultisigWatchOnly, StateRestorerOpts } from 'ldk';
import { decrypt } from '../application/utils';
import { restoredMasterPublicKey, restoredMnemonic } from '../application/utils/restorer';
import { EncryptedMnemonic } from './encrypted-mnemonic';
import { MasterBlindingKey } from './master-blinding-key';
import { MasterXPub } from './master-extended-pub';
import { Network } from './network';

export interface Account<SignID extends IdentityInterface = IdentityInterface, WatchID extends IdentityInterface = IdentityInterface> {
  getSigningIdentity(password: string): Promise<SignID>;
  getWatchIdentity(): Promise<WatchID>;
  [propName: string]: any;
}

export type MainAccount = Account<Mnemonic, MasterPublicKey>;
export type MultisigAccount = Account<Multisig, MultisigWatchOnly>;

export interface MnemonicAccountData {
  encryptedMnemonic: EncryptedMnemonic;
  restorerOpts: StateRestorerOpts;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

export function createMnemonicAccount(data: MnemonicAccountData, network: Network): MainAccount {
  return {
    getSigningIdentity: (password: string) =>
      restoredMnemonic(decrypt(data.encryptedMnemonic, password), data.restorerOpts, network),
    getWatchIdentity: () =>
      restoredMasterPublicKey(data.masterXPub, data.masterBlindingKey, data.restorerOpts, network),
  };
}
