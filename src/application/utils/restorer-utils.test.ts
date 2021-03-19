import { MasterPublicKey } from 'ldk';
import { nextAddressForWallet } from './restorer';
import { testWalletProps } from '../../../test/fixtures/test-wallet';
import { addresses, addressesChange } from '../../../test/fixtures/wallet.json';
import { Address } from '../../domain/wallet/value-objects';

describe('Restorer Utils', () => {
  afterEach(() => {
    MasterPublicKey.INITIAL_INDEX = 0;
  });

  test('Should produce correct derivation paths', async () => {
    const a = await nextAddressForWallet(testWalletProps, 'regtest', false);
    expect(a.derivationPath).toStrictEqual("m/84'/0'/0'/0/0");
    const b = await nextAddressForWallet(
      { ...testWalletProps, confidentialAddresses: [a] },
      'regtest',
      false
    );
    expect(b.derivationPath).toStrictEqual("m/84'/0'/0'/0/1");
    const c = await nextAddressForWallet(
      { ...testWalletProps, confidentialAddresses: [a, b] },
      'regtest',
      false
    );
    expect(c.derivationPath).toStrictEqual("m/84'/0'/0'/0/2");
    const d = await nextAddressForWallet(
      { ...testWalletProps, confidentialAddresses: [a, b, c] },
      'regtest',
      true
    );
    expect(d.derivationPath).toStrictEqual("m/84'/0'/0'/1/0");
    const e = await nextAddressForWallet(
      { ...testWalletProps, confidentialAddresses: [a, b, c, d] },
      'regtest',
      true
    );
    expect(e.derivationPath).toStrictEqual("m/84'/0'/0'/1/1");
    const f = await nextAddressForWallet(
      { ...testWalletProps, confidentialAddresses: [a, b, c, d, e] },
      'regtest',
      false
    );
    expect(f.derivationPath).toStrictEqual("m/84'/0'/0'/0/3");
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
