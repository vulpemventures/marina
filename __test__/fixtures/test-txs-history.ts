import { TxsHistoryByNetwork } from '../../src/domain/transaction';
import { stringify } from '../../src/application/utils/browser-storage-converters';

export const testTxsHistoryByNetworkDTO = {
  liquid: stringify({}),
  regtest: stringify({}),
};
export const testTxsHistoryByNetwork = {
  liquid: {},
  regtest: {},
};

export const testTx = {
  txid: expect.any(String),
  fee: expect.any(Number),
  status: expect.objectContaining({
    confirmed: expect.any(Boolean),
    blockHeight: expect.any(Number),
    blockHash: expect.any(String),
    blockTime: expect.any(Number),
  }),
  vin: expect.any(Array),
  vout: expect.any(Array),
};

export const testTxsHistoryUpdated1: TxsHistoryByNetwork = {
  liquid: {},
  regtest: {
    '60d4a99f2413d67ad58a66a6e0d108957208f66484c1208a8aacebac4fc148bb': testTx,
  },
};

// TODO: Fix object with dynamic keys
// export const testTxsHistoryUpdated1: TxsHistoryByNetwork = {
//   liquid: {},
//   regtest: {
//     [expect.any(String)]: testTx,
//   },
// };
