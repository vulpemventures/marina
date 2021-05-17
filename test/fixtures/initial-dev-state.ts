import { IWallet } from '../../src/domain/wallet';
import {
  EncryptedMnemonic,
  MasterBlindingKey,
  MasterXPub,
  PasswordHash,
} from '../../src/domain/wallet/value-objects';
import { encryptedMnemonic, masterBlindingKey, masterXPub, passwordHash } from './wallet.json';
import { UtxoInterface } from 'ldk';
import { IApp } from '../../src/domain/app';
import { Network } from '../../src/domain/app/value-objects';

export const devWalletInitState: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  utxoMap: new Map<string, UtxoInterface>(),
};

export const devAppInitState: IApp = {
  isAuthenticated: true,
  isOnboardingCompleted: true,
  isWalletVerified: true,
  network: Network.create('regtest'),
};
