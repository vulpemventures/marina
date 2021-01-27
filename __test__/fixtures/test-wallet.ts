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
import { utxosUnblinded } from './utxos-unblinded.json';

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

// With 1 Confidential Address
export const testWalletWithConfidentialAddrDTO: WalletDTO = {
  confidentialAddresses: [confidentialAddresses[0].address],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  walletId: v4(),
};
export const testWalletWithConfidentialAddrProps: IWallet = {
  confidentialAddresses: [Address.create(confidentialAddresses[0].address)],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
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
  walletId: v4(),
};
export const testWalletRestoredProps: IWallet = {
  // TODO: How to make tests resilient?
  //confidentialAddresses: [],
  confidentialAddresses: [
    Address.create(confidentialAddresses[0].address),
    //Address.create(confidentialAddresses[1].address),
  ],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  restored: true,
};
export const testWalletRestored: Wallet = Wallet.createWallet(testWalletRestoredProps);

// UTXOs
type PrevoutProps = 'asset' | 'value' | 'nonce' | 'script' | 'rangeProof' | 'surjectionProof';
const convertPrevoutPropsToBuffer = (
  prevout: Record<PrevoutProps, { type: string; data: number[] }>
): Record<PrevoutProps, Buffer> => {
  return Object.entries(prevout).reduce(
    (acc, curr) => ({ ...acc, [curr[0]]: Buffer.from(curr[1].data) }),
    {} as Record<PrevoutProps, Buffer>
  );
};
const utxosUnblinded0 = {
  ...utxosUnblinded[0],
  prevout: { ...convertPrevoutPropsToBuffer(utxosUnblinded[0].prevout) },
};
const utxosUnblinded1 = {
  ...utxosUnblinded[1],
  prevout: { ...convertPrevoutPropsToBuffer(utxosUnblinded[1].prevout) },
};

export const testWalletUtxosDTO: WalletDTO = {
  confidentialAddresses: [],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  utxos: [utxosUnblinded0, utxosUnblinded1],
  walletId: v4(),
};
export const testWalletUtxosProps: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  utxos: [utxosUnblinded0, utxosUnblinded1],
};
export const testWalletUtxos: Wallet = Wallet.createWallet(testWalletUtxosProps);
