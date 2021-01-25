import { IWallet, Wallet } from '../../src/domain/wallet/wallet';
import { WalletDTO } from '../../src/application/dtos/wallet-dto';
import {
  Address,
  EncryptedMnemonic,
  MasterBlindingKey,
  MasterXPub,
  PasswordHash,
} from '../../src/domain/wallet/value-objects';
import {
  confidentialAddresses,
  encryptedMnemonic,
  masterXPub,
  masterBlindingKey,
  passwordHash,
} from './wallet.json';

// Mock for UniqueEntityID
jest.mock('uuid');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4 } = require('uuid');
v4.mockImplementation(() => 'test-id');

// Initial
export const testWalletDTO: WalletDTO = {
  confidentialAddresses: [],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  walletId: v4(),
};
export const testWalletProps: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
};
export const testWallet: Wallet = Wallet.createWallet(testWalletProps);

// With Confidential Addresses
export const testWalletWithConfidentialAddrDTO: WalletDTO = {
  confidentialAddresses: [confidentialAddresses[0].value],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  walletId: v4(),
};
export const testWalletWithConfidentialAddrProps: IWallet = {
  confidentialAddresses: [Address.create(confidentialAddresses[0].value)],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
};
export const testWalletWithConfidentialAddr: Wallet = Wallet.createWallet(
  testWalletWithConfidentialAddrProps
);

// Restored, without generated confidential addresses
export const testWalletRestoredDTO: WalletDTO = {
  confidentialAddresses: [],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  walletId: v4(),
};
export const testWalletRestoredProps: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  restored: true,
};
export const testWalletRestored: Wallet = Wallet.createWallet(testWalletRestoredProps);
