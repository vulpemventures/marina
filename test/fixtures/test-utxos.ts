import { UtxoInterface } from 'ldk';
import { WalletDTO } from '../../src/application/dtos/wallet-dto';
import {
  EncryptedMnemonic,
  MasterXPub,
  MasterBlindingKey,
  PasswordHash,
} from '../../src/domain/wallet/value-objects';
import { IWallet, Wallet } from '../../src/domain/wallet';
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
    script: expect.any(Buffer),
  },
  unblindData: {
    value: expect.any(String),
    asset: expect.any(Buffer),
    valueBlindingFactor: expect.any(Buffer),
    assetBlindingFactor: expect.any(Buffer),
  },
};

export const getUtxoMap = (num: number) => {
  const utxoMap = new Map();
  [...Array(num)].forEach(() => {
    utxoMap.set(expect.any(String), utxo);
  });
  return expect.objectContaining(utxoMap);
};

export const testWalletUtxosDTO: WalletDTO = {
  confidentialAddresses: [],
  encryptedMnemonic: encryptedMnemonic,
  masterXPub: masterXPub,
  masterBlindingKey: masterBlindingKey,
  passwordHash: passwordHash,
  utxoMap: JSON.stringify([
    ...new Map().set('2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439:0', {
      ...utxo,
      asset: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8',
      value: 123000000,
    }),
  ]),
  walletId: v4(),
};
export const testWalletUtxosProps: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
  errors: undefined,
  masterXPub: MasterXPub.create(masterXPub),
  masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
  passwordHash: PasswordHash.create(passwordHash),
  utxoMap: new Map()
    .set('2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439:0', {
      ...utxo,
      asset: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8',
      value: 123000000,
    })
    .set('5bd82976903fe9ebff1249f35b5a8b0a7b47053d0980ff08e1c795101a3add5b:2', {
      ...utxo,
      asset: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d',
      value: 42069420,
    }),
};
export const testWalletUtxos: Wallet = Wallet.createWallet(testWalletUtxosProps);
