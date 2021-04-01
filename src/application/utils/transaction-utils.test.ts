import { extractInfoFromRawTxData, getTxsDetails } from './transaction';
//
import receiveUsdtFeeLbtc from '../../../test/fixtures/tx-interface/receive/receive-usdt-fee-lbtc.json';
import receiveLbtcFeeLbtc from '../../../test/fixtures/tx-interface/receive/receive-lbtc-fee-lbtc.json';
//
import sendLbtcFeeLbtcConf from '../../../test/fixtures/tx-interface/send/send-lbtc-fee-lbtc-conf.json';
import sendLbtcFeeLbtcConfSendAll from '../../../test/fixtures/tx-interface/send/send-lbtc-fee-lbtc-conf-send-all.json';
import sendLbtcFeeUsdtConf from '../../../test/fixtures/tx-interface/send/send-lbtc-fee-usdt-conf.json';
import sendLbtcFeeLbtcConfToSelf from '../../../test/fixtures/tx-interface/send/send-lbtc-fee-lbtc-conf-to-self.json';
//
import sendUsdtFeeLbtcConf from '../../../test/fixtures/tx-interface/send/send-usdt-fee-lbtc-conf.json';
import sendUsdtFeeLbtcUnconf from '../../../test/fixtures/tx-interface/send/send-usdt-fee-lbtc-unconf.json';
import sendUsdtFeeUsdtConf from '../../../test/fixtures/tx-interface/send/send-usdt-fee-usdt-conf.json';
import sendUsdtFeeLbtcConfSendAll from '../../../test/fixtures/tx-interface/send/send-usdt-fee-lbtc-conf-send-all.json';
import sendUsdtFeeUsdtUnconf from '../../../test/fixtures/tx-interface/send/send-usdt-fee-usdt-unconf.json';
//
import { Address } from '../../domain/wallet/value-objects';
import { addresses, addressesChange } from '../../../test/fixtures/wallet.json';
import { TxInterface } from 'ldk';

describe('Transaction Utils', () => {
  const assetsInStore = {
    '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
      name: 'Liquid Bitcoin',
      precision: 8,
      ticker: 'L-BTC',
    },
  };

  const assetsInStoreTaxi = {
    '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
      name: 'Liquid Bitcoin',
      precision: 8,
      ticker: 'L-BTC',
    },
    e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c: {
      name: 'Tether USD',
      precision: 8,
      ticker: 'USDt',
    },
  };

  describe('Receive', () => {
    test('Should extract info from raw tx data - Receive 100 USDt and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(addresses[0].confidential, addresses[0].derivationPath),
        Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
      ];
      const tx: TxInterface = JSON.parse(JSON.stringify(receiveUsdtFeeLbtc));
      const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStore);

      return expect(res).toStrictEqual({
        address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
        amount: 10000000000,
        asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        toSelf: false,
        type: 'receive',
        unblindURL: expect.anything()
      });
    });

    test('Should extract info from raw tx data - Receive 20 L-BTC and fees paid in L-BTC', () => {
      const confAddrs: Address[] = [
        Address.create(addresses[0].confidential, addresses[0].derivationPath),
        Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
      ];
      const tx: TxInterface = JSON.parse(JSON.stringify(receiveLbtcFeeLbtc));
      const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStore);

      return expect(res).toStrictEqual({
        address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
        amount: 2000000000,
        asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
        toSelf: false,
        type: 'receive',
        unblindURL: expect.anything()
      });
    });
  });

  describe('Send', () => {
    describe('Should extract info from raw tx data - Non Taxi payments', () => {
      test('Send 2 L-BTC to confidential address and fees paid in L-BTC', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendLbtcFeeLbtcConf));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStore);

        return expect(res).toStrictEqual({
          address: 'ert1qh0j6u6ehd9wel0hx7thvlseaqlaefrkrg5sn0q',
          amount: 200000000,
          asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          toSelf: false,
          type: 'send',
          unblindURL: expect.anything()
        });
      });

      test('Spend all 20 L-BTC balance to confidential address and fees paid in L-BTC', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[0].confidential, addressesChange[0].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendLbtcFeeLbtcConfSendAll));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStore);

        return expect(res).toStrictEqual({
          address: 'ert1quhwp6sc890z25rth2ljfq0pudal98yqswwd0jc',
          amount: 2000000000,
          asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          toSelf: false,
          type: 'send',
          unblindURL: expect.anything()
        });
      });

      test('Send 10 L-BTC to ourself and fees paid in L-BTC', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[0].confidential, addressesChange[0].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendLbtcFeeLbtcConfToSelf));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStore);

        return expect(res).toStrictEqual({
          address: 'ert1qafdcuwjxhqvsfyd498kc7mle0pkq9n48y9xctl',
          amount: 1000000000,
          asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          toSelf: true,
          type: 'send',
          unblindURL: expect.anything()
        });
      });

      test('Send 5 USDt to confidential address and fees paid in L-BTC', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendUsdtFeeLbtcConf));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStore);

        return expect(res).toStrictEqual({
          address: 'ert1qpt67avhdvkae759mfxssechq3kydhll5ht96vr',
          amount: 500000000,
          asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
          feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          toSelf: false,
          type: 'send',
          unblindURL: expect.anything()
        });
      });

      test('Send 3 USDt to unconfidential address and fees paid in L-BTC', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[0].confidential, addressesChange[0].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendUsdtFeeLbtcUnconf));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStore);

        return expect(res).toStrictEqual({
          address: 'ert1q24vgnwk88y0k4h3ene0qfayp8umcnhc3tljrk5',
          amount: 300000000,
          asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
          feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          toSelf: false,
          type: 'send',
          unblindURL: expect.anything()
        });
      });

      test('Spend all 100 USDt balance to confidential address and fees paid in L-BTC', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[0].confidential, addressesChange[0].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendUsdtFeeLbtcConfSendAll));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStore);

        return expect(res).toStrictEqual({
          address: 'ert1quhwp6sc890z25rth2ljfq0pudal98yqswwd0jc',
          amount: 10000000000,
          asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
          feeAsset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          toSelf: false,
          type: 'send',
          unblindURL: expect.anything()
        });
      });
    });

    describe('Taxi payments', () => {
      test('Should extract info from raw tx data - Send 3 USDt to confidential address and fees paid in USDt', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendUsdtFeeUsdtConf));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStoreTaxi);
        return expect(res).toStrictEqual({
          address: 'ert1quhwp6sc890z25rth2ljfq0pudal98yqswwd0jc',
          amount: 3000000000,
          asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
          feeAsset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
          taxiFeeAmount: 44000000,
          toSelf: false,
          type: 'send',
          unblindURL: expect.anything()
        });
      });

      test('Should extract info from raw tx data - Send 2 USDt to unconfidential address and fees paid in USDt', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendUsdtFeeUsdtUnconf));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStoreTaxi);
        return expect(res).toStrictEqual({
          address: '',
          amount: 0,
          asset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
          feeAsset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
          taxiFeeAmount: 44000000,
          toSelf: false,
          type: 'send',
          unblindURL: expect.anything()
        });
      });

      test('Should extract info from raw tx data - Send 1 L-BTC to confidential address and fees paid in USDt', () => {
        const confAddrs: Address[] = [
          Address.create(addresses[0].confidential, addresses[0].derivationPath),
          Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
        ];
        const tx: TxInterface = JSON.parse(JSON.stringify(sendLbtcFeeUsdtConf));
        const res = extractInfoFromRawTxData(tx, 'regtest', confAddrs, assetsInStoreTaxi);
        return expect(res).toStrictEqual({
          address: 'ert1quhwp6sc890z25rth2ljfq0pudal98yqswwd0jc',
          amount: 100000000,
          asset: '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225',
          feeAsset: 'e19655127be5bbdd09831c0ee6f90634597573ab9832e77e5572a42d2cc0903c',
          taxiFeeAmount: 44000000,
          toSelf: false,
          type: 'send',
          unblindURL: expect.anything()
        });
      });
    });
  });

  test('Should get txs details sorted by asset', () => {
    const confAddrs: Address[] = [
      Address.create(addresses[0].confidential, addresses[0].derivationPath),
      Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
    ];
    const tx: TxInterface = JSON.parse(JSON.stringify(receiveLbtcFeeLbtc));
    const res = getTxsDetails([tx], 'regtest', confAddrs, assetsInStore).byAsset;
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
          unblindURL: expect.anything()
        },
      ],
    });
  });

  test('Should get txs details sorted by txid', () => {
    const confAddrs: Address[] = [
      Address.create(addresses[0].confidential, addresses[0].derivationPath),
      Address.create(addressesChange[1].confidential, addressesChange[1].derivationPath),
    ];
    const tx: TxInterface = JSON.parse(JSON.stringify(receiveLbtcFeeLbtc));
    const res = getTxsDetails([tx], 'regtest', confAddrs, assetsInStore).byTxId;
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
        unblindURL: expect.anything()
      },
    });
  });
});
