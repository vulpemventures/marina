import { MasterPublicKey } from 'ldk';
import { nextAddressForWallet } from './restorer';
import { testWalletProps } from '../../../__test__/fixtures/test-wallet';
import { addresses, addressesChange } from '../../../__test__/fixtures/wallet.json';
import { Address } from '../../domain/wallet/value-objects';

describe('Restorer Utils', () => {
  afterEach(() => {
    MasterPublicKey.INITIAL_INDEX = 0;
  });

  test('Should produce correct non-change addresses', async () => {
    const received = [];

    function* nextAddr() {
      let index = 0;
      while (true) {
        yield nextAddressForWallet(testWalletProps, 'regtest', false);
        index++;
        MasterPublicKey.INITIAL_INDEX = index;
      }
    }

    const generateAddr = nextAddr();

    for (let i = 0; i < 10; i++) {
      try {
        throw i;
      } catch (ii) {
        const res = (await generateAddr.next().value) as Address;
        received.push({
          confidential: res.value,
          unconfidential: res.unconfidentialAddress,
          derivationPath: res.derivationPath,
        });
      }
    }

    return expect(received).toStrictEqual(addresses);
  });

  test('Should produce correct change addresses', async () => {
    const received = [];

    function* nextAddr() {
      let index = 0;
      while (true) {
        yield nextAddressForWallet(testWalletProps, 'regtest', true);
        index++;
        MasterPublicKey.INITIAL_INDEX = index;
      }
    }

    const generateAddr = nextAddr();

    for (let i = 0; i < 10; i++) {
      try {
        throw i;
      } catch (ii) {
        const res = (await generateAddr.next().value) as Address;
        received.push({
          confidential: res.value,
          unconfidential: res.unconfidentialAddress,
          derivationPath: res.derivationPath,
        });
      }
    }

    return expect(received).toStrictEqual(addressesChange);
  });
});
