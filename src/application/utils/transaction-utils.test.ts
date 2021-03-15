import { extractInfoFromRawTxData, getTxsDetails } from './transaction';
import receiveUsdtFeeLbtc from '../../../test/fixtures/tx-interface/receive/receive-usdt-fee-lbtc.json';
import receiveLbtcFeeLbtc from '../../../test/fixtures/tx-interface/receive/receive-lbtc-fee-lbtc.json';
import sendLbtcFeeLbtcConf from '../../../test/fixtures/tx-interface/send/send-lbtc-fee-lbtc-conf.json';
import sendUsdtFeeLbtcConf from '../../../test/fixtures/tx-interface/send/send-usdt-fee-lbtc-conf.json';
import sendUsdtFeeLbtcUnconf from '../../../test/fixtures/tx-interface/send/send-usdt-fee-lbtc-unconf.json';
import { Address } from '../../domain/wallet/value-objects';
import { addresses, addressesChange } from '../../../test/fixtures/wallet.json';

describe('Transaction Utils', () => {
  describe('Receive', () => {
    test('Should extract info from raw tx data - Receive 100 USDt and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(addresses[0].confidential, addresses[0].derivationPath),
        Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(receiveUsdtFeeLbtc));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
        amount: 10000000000,
        asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        toSelf: false,
        type: 'receive',
      });
    });

    test('Should extract info from raw tx data - Receive 20 L-BTC and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(addresses[0].confidential, addresses[0].derivationPath),
        Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(receiveLbtcFeeLbtc));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
        amount: 2000000000,
        asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        toSelf: false,
        type: 'receive',
      });
    });
  });

  describe('Send', () => {
    test('Should extract info from raw tx data - Send 2 L-BTC to confidential address and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(addresses[0].confidential, addresses[0].derivationPath),
        Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(sendLbtcFeeLbtcConf));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1qh0j6u6ehd9wel0hx7thvlseaqlaefrkrg5sn0q',
        amount: 200000000,
        asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        toSelf: false,
        type: 'send',
      });
    });

    test('Should extract info from raw tx data - Send 5 USDt to confidential address and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(addresses[0].confidential, addresses[0].derivationPath),
        Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(sendUsdtFeeLbtcConf));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1qpt67avhdvkae759mfxssechq3kydhll5ht96vr',
        amount: 500000000,
        asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        toSelf: false,
        type: 'send',
      });
    });

    test('Should extract info from raw tx data - Send 3 USDt to unconfidential address and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(addresses[0].confidential, addresses[0].derivationPath),
        Address.create(addressesChange[0].confidential, addressesChange[0].derivationPath),
      ];
      const { vin, vout } = JSON.parse(JSON.stringify(sendUsdtFeeLbtcUnconf));
      const res = extractInfoFromRawTxData(vin, vout, 'regtest', confAddrs);

      return expect(res).toStrictEqual({
        address: 'ert1q24vgnwk88y0k4h3ene0qfayp8umcnhc3tljrk5',
        amount: 300000000,
        asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        toSelf: false,
        type: 'send',
      });
    });
  });

  test('Should get txs details sorted by asset', () => {
    const confAddrs: Address[] = [
      Address.create(addresses[0].confidential, addresses[0].derivationPath),
      Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
    ];
    const tx = JSON.parse(JSON.stringify(receiveLbtcFeeLbtc));
    const res = getTxsDetails([tx], 'regtest', confAddrs).byAsset;
    return expect(res).toStrictEqual({
      '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': [
        {
          address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
          amount: 2000000000,
          asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          blockTime: 1614359526,
          date: '26 February 2021',
          dateContracted: '26 Feb 2021',
          fee: 4982,
          feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          status: 'confirmed',
          toSelf: false,
          txId: 'b7f45d63f296aa683a5594be672bbbcc8d5527b1ab6dbb4b75f3fd6c7dcca478',
          type: 'receive',
        },
      ],
    });
  });

  test('Should get txs details sorted by txid', () => {
    const confAddrs: Address[] = [
      Address.create(addresses[0].confidential, addresses[0].derivationPath),
      Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
    ];
    const tx = JSON.parse(JSON.stringify(receiveLbtcFeeLbtc));
    const res = getTxsDetails([tx], 'regtest', confAddrs).byTxId;
    return expect(res).toStrictEqual({
      b7f45d63f296aa683a5594be672bbbcc8d5527b1ab6dbb4b75f3fd6c7dcca478: {
        address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
        amount: 2000000000,
        asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        blockTime: 1614359526,
        date: '26 February 2021',
        dateContracted: '26 Feb 2021',
        fee: 4982,
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        status: 'confirmed',
        toSelf: false,
        txId: 'b7f45d63f296aa683a5594be672bbbcc8d5527b1ab6dbb4b75f3fd6c7dcca478',
        type: 'receive',
      },
    });
  });
});
