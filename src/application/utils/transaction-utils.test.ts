import { extractInfoFromRawTxData, getTxsDetails } from './transaction';
import receiveUsdt from '../../../__test__/fixtures/tx-interface/receive/receive-usdt.json';
import receiveLbtc from '../../../__test__/fixtures/tx-interface/receive/receive-lbtc.json';
import sendLbtc from '../../../__test__/fixtures/tx-interface/send/send-lbtc.json';
import sendUsdt from '../../../__test__/fixtures/tx-interface/send/send-usdt.json';
import { Address } from '../../domain/wallet/value-objects';
import { confidentialAddresses } from '../../../__test__/fixtures/wallet.json';

describe('Transaction Utils', () => {
  describe('Receive', () => {
    test('Should extract info from raw tx data - Receive 100 USDt and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(confidentialAddresses[0].address),
        Address.create(confidentialAddresses[1].address),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(receiveUsdt));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
        amount: 10000000000,
        asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        type: 'receive',
      });
    });

    test('Should extract info from raw tx data - Receive 20 L-BTC and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(confidentialAddresses[0].address),
        Address.create(confidentialAddresses[1].address),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(receiveLbtc));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
        amount: 2000000000,
        asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        type: 'receive',
      });
    });
  });

  describe('Send', () => {
    test('Should extract info from raw tx data - Send 2 L-BTC and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(confidentialAddresses[0].address),
        Address.create(confidentialAddresses[1].address),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(sendLbtc));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1qh0j6u6ehd9wel0hx7thvlseaqlaefrkrg5sn0q',
        amount: 200000000,
        asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        type: 'send',
      });
    });

    test('Should extract info from raw tx data - Send 5 USDt and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(confidentialAddresses[0].address),
        Address.create(confidentialAddresses[1].address),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(sendUsdt));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1qpt67avhdvkae759mfxssechq3kydhll5ht96vr',
        amount: 500000000,
        asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        type: 'send',
      });
    });
  });

  test('Should get txs details sorted by asset', () => {
    const confAddrs: Address[] = [
      Address.create(confidentialAddresses[0].address),
      Address.create(confidentialAddresses[1].address),
    ];
    const tx = JSON.parse(JSON.stringify(receiveLbtc));
    const res = getTxsDetails([tx], 'regtest', confAddrs).byAsset;
    return expect(res).toStrictEqual({
      '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': [
        {
          address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
          amount: 2000000000,
          asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          date: '26 February 2021',
          dateContracted: '26 Feb 2021',
          fee: 4982,
          feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          status: 'confirmed',
          txId: 'b7f45d63f296aa683a5594be672bbbcc8d5527b1ab6dbb4b75f3fd6c7dcca478',
          type: 'receive',
        },
      ],
    });
  });

  test('Should get txs details sorted by txid', () => {
    const confAddrs: Address[] = [
      Address.create(confidentialAddresses[0].address),
      Address.create(confidentialAddresses[1].address),
    ];
    const tx = JSON.parse(JSON.stringify(receiveLbtc));
    const res = getTxsDetails([tx], 'regtest', confAddrs).byTxId;
    return expect(res).toStrictEqual({
      b7f45d63f296aa683a5594be672bbbcc8d5527b1ab6dbb4b75f3fd6c7dcca478: {
        address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
        amount: 2000000000,
        asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        date: '26 February 2021',
        dateContracted: '26 Feb 2021',
        fee: 4982,
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        status: 'confirmed',
        txId: 'b7f45d63f296aa683a5594be672bbbcc8d5527b1ab6dbb4b75f3fd6c7dcca478',
        type: 'receive',
      },
    });
  });
});
