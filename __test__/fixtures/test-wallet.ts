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
  pendingTx,
} from './wallet.json';
import {
  encryptedMnemonic as encryptedMnemonicRestore,
  masterXPub as masterXPubRestore,
  masterBlindingKey as masterBlindingKeyRestore,
  passwordHash as passwordHashRestore,
} from './restore-wallet.json';

import { Transaction } from '../../src/domain/wallet/value-objects/transaction';

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
  pendingTx: undefined,
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
  pendingTx: undefined,
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
  pendingTx: undefined,
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
  pendingTx: undefined,
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
  pendingTx: undefined,
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
  pendingTx: undefined,
  utxoMap: new Map<Outpoint, UtxoInterface>(),
};
export const testWalletWith2ConfidentialAddr: Wallet = Wallet.createWallet(
  testWalletWith2ConfidentialAddrProps
);

// Restored, without generated confidential addresses
export const testWalletRestoredDTO: WalletDTO = {
  confidentialAddresses: [],
  encryptedMnemonic: encryptedMnemonicRestore,
  masterXPub: masterXPubRestore,
  masterBlindingKey: masterBlindingKeyRestore,
  passwordHash: passwordHashRestore,
  pendingTx: undefined,
  utxoMap: new Map<Outpoint, UtxoInterface>(),
  walletId: v4(),
};
export const testWalletRestoredProps: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonicRestore),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPubRestore),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKeyRestore),
  passwordHash: PasswordHash.create(passwordHashRestore),
  pendingTx: undefined,
  restored: true,
  utxoMap: new Map<Outpoint, UtxoInterface>(),
};
export const testWalletRestored: Wallet = Wallet.createWallet(testWalletRestoredProps);

//
export const testWalletWithPendingTxDTO: WalletDTO = {
  confidentialAddresses: [],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  walletId: v4(),
  pendingTx: pendingTx,
  utxoMap: new Map<Outpoint, UtxoInterface>(),
};
export const testWalletWithPendingTxProps: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  pendingTx: Transaction.create(pendingTx),
  utxoMap: new Map<Outpoint, UtxoInterface>(),
};
export const testWalletWithPendingTx: Wallet = Wallet.createWallet(testWalletWithPendingTxProps);
