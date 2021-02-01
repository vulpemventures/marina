import { Outpoint, UtxoInterface } from 'ldk';
import { WalletDTO } from '../../src/application/dtos/wallet-dto';
import { IWallet, Wallet } from '../../src/domain/wallet/wallet';
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
  utxoMap: new Map<Outpoint, UtxoInterface>(),
  walletId: v4(),
};
export const testWalletProps: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  utxoMap: new Map<Outpoint, UtxoInterface>(),
};
export const testWallet: Wallet = Wallet.createWallet(testWalletProps);

// With 1 Confidential Address
export const testWalletWithConfidentialAddrDTO: WalletDTO = {
  confidentialAddresses: [confidentialAddresses[0].address],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  utxoMap: new Map<Outpoint, UtxoInterface>(),
  walletId: v4(),
};
export const testWalletWithConfidentialAddrProps: IWallet = {
  confidentialAddresses: [Address.create(confidentialAddresses[0].address)],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  utxoMap: new Map<Outpoint, UtxoInterface>(),
};
export const testWalletWithConfidentialAddr: Wallet = Wallet.createWallet(
  testWalletWithConfidentialAddrProps
);

// With 2 Confidential Addresses
export const testWalletWith2ConfidentialAddrDTO: WalletDTO = {
  confidentialAddresses: [confidentialAddresses[0].address, confidentialAddresses[1].address],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  utxoMap: new Map<Outpoint, UtxoInterface>(),
  walletId: v4(),
};
export const testWalletWith2ConfidentialAddrProps: IWallet = {
  confidentialAddresses: [
    Address.create(confidentialAddresses[0].address),
    Address.create(confidentialAddresses[1].address),
  ],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  utxoMap: new Map<Outpoint, UtxoInterface>(),
};
export const testWalletWith2ConfidentialAddr: Wallet = Wallet.createWallet(
  testWalletWith2ConfidentialAddrProps
);

// Restored, without generated confidential addresses
export const testWalletRestoredDTO: WalletDTO = {
  confidentialAddresses: [],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  utxoMap: new Map<Outpoint, UtxoInterface>(),
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
  utxoMap: new Map<Outpoint, UtxoInterface>(),
};
export const testWalletRestored: Wallet = Wallet.createWallet(testWalletRestoredProps);