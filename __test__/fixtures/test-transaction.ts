import { UtxoInterface } from 'ldk';
import { WalletDTO } from '../../src/application/dtos/wallet-dto';
import {
  EncryptedMnemonic,
  MasterXPub,
  MasterBlindingKey,
  PasswordHash,
} from '../../src/domain/wallet/value-objects';
import { IWallet, Wallet } from '../../src/domain/wallet/wallet';
import { encryptedMnemonic, masterXPub, masterBlindingKey, passwordHash } from './wallet.json';

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

export const getUtxoMap = (num: number) => {
  const utxoMap = new Map();
  [...Array(num)].forEach((_, i) => {
    utxoMap.set(
      expect.objectContaining({
        txid: expect.any(String),
        vout: expect.any(Number),
      }),
      utxo
    );
  });
  return utxoMap;
};

export const testWalletUtxosDTO: WalletDTO = {
  confidentialAddresses: [],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  utxoMap: new Map().set(
    { txid: '2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439', vout: 0 },
    {
      txid: expect.any(String),
      vout: expect.any(Number),
      asset: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8',
      value: 123000000,
      prevout: {
        asset: expect.any(Buffer),
        value: expect.any(Number),
        nonce: expect.any(Buffer),
        rangeProof: expect.any(Buffer),
        surjectionProof: expect.any(Buffer),
        script: expect.anything(),
      },
    }
  ),
  walletId: v4(),
};
export const testWalletUtxosProps: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  utxoMap: new Map().set(
    { txid: '2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439', vout: 0 },
    {
      txid: expect.any(String),
      vout: expect.any(Number),
      asset: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8',
      value: 123000000,
      prevout: {
        asset: expect.any(Buffer),
        value: expect.any(Number),
        nonce: expect.any(Buffer),
        rangeProof: expect.any(Buffer),
        surjectionProof: expect.any(Buffer),
        script: expect.anything(),
      },
    }
  ),
};
export const testWalletUtxos: Wallet = Wallet.createWallet(testWalletUtxosProps);
