import { createMasterXPub, MasterXPub } from '../../domain/master-extended-pub';
import { EncryptedMnemonic } from '../../domain/encrypted-mnemonic';
import { Mnemonic, IdentityType, StateRestorerOpts, mnemonicRestorerFromEsplora } from 'ldk';
import { Network } from '../../domain/network';
import { PasswordHash } from '../../domain/password-hash';
import { Mnemonic as Mnemo } from '../../domain/mnemonic';
import { createMasterBlindingKey, MasterBlindingKey } from '../../domain/master-blinding-key';
import { Password } from '../../domain/password';
import { getStateRestorerOptsFromAddresses } from './restorer';
import { encrypt, hashPassword } from './crypto';

export interface WalletData {
  encryptedMnemonic: EncryptedMnemonic;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
  passwordHash: PasswordHash;
  restorerOpts: StateRestorerOpts;
}

export async function createWalletFromMnemonic(
  password: Password,
  mnemonic: Mnemo,
  chain: Network,
  esploraURL: string
): Promise<WalletData> {
  const toRestore = new Mnemonic({
    chain,
    type: IdentityType.Mnemonic,
    opts: { mnemonic },
  });

  const mnemonicIdentity = await mnemonicRestorerFromEsplora(toRestore)({
    esploraURL,
    gapLimit: 20,
  });
  const masterXPub = createMasterXPub(mnemonicIdentity.masterPublicKey);
  const masterBlindingKey = createMasterBlindingKey(mnemonicIdentity.masterBlindingKey);
  const encryptedMnemonic = encrypt(mnemonic, password);
  const passwordHash = hashPassword(password);
  const addresses = await mnemonicIdentity.getAddresses()

  return {
    restorerOpts: getStateRestorerOptsFromAddresses(addresses),
    encryptedMnemonic,
    masterXPub,
    masterBlindingKey,
    passwordHash,
  };
}
