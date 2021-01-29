import { UtxoInterface } from 'ldk';

// Mock for UniqueEntityID
jest.mock('uuid');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4 } = require('uuid');
v4.mockImplementation(() => 'test-id');

// UTXOs
export const utxo: UtxoInterface = {
  txid: expect.any(String),
  vout: expect.any(Number),
  asset: expect.any(String),
  value: expect.any(Number),
  prevout: {
    asset: expect.any(Buffer),
    value: expect.any(Buffer),
    nonce: expect.any(Buffer),
    rangeProof: expect.any(Buffer),
    surjectionProof: expect.any(Buffer),
    script: expect.anything(),
  },
};
// export const testWalletUtxosDTO: WalletDTO = {
//   confidentialAddresses: [],
//   encryptedMnemonic: encryptedMnemonic,
//   masterXPub: masterXPub,
//   masterBlindingKey: masterBlindingKey,
//   passwordHash: passwordHash,
//   utxos: utxoArray,
//   walletId: v4(),
// };
// export const testWalletUtxosProps: IWallet = {
//   confidentialAddresses: [],
//   encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
//   errors: undefined,
//   masterXPub: MasterXPub.create(masterXPub),
//   masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
//   passwordHash: PasswordHash.create(passwordHash),
//   utxos: utxoArray,
// };
// export const testWalletUtxos: Wallet = Wallet.createWallet(testWalletUtxosProps);
