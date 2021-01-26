import { Address } from './address';
import { addresses } from '../../../../__test__/fixtures/wallet.json';

describe('Address - Regtest', () => {
  test('Should throw if non-base58 characters', () => {
    expect(() => Address.create('invalidaddress0OlI!')).toThrow('Non-base58 character');
  });

  test('Should be able to create an legacy address', () => {
    const address = Address.create(addresses.regtest.legacy[0]);
    expect(address.value).toContain(addresses.regtest.legacy[0]);
    //
    expect(() => Address.create(addresses.regtest.legacy[0].slice(0, 20))).toThrow(
      'Invalid checksum'
    );
  });

  test('Should be able to create an np2sh address', () => {
    const address = Address.create(addresses.regtest.np2sh[0]);
    expect(address.value).toContain(addresses.regtest.np2sh[0]);
    //
    expect(() => Address.create(addresses.regtest.np2sh[0].slice(0, 20))).toThrow(
      'Invalid checksum'
    );
  });

  test('Should be able to create an bech32 address', () => {
    const address = Address.create(addresses.regtest.bech32[0]);
    expect(address.value).toContain(addresses.regtest.bech32[0]);
    //
    expect(() => Address.create(addresses.regtest.bech32[0].slice(0, 20))).toThrow(
      `Invalid checksum for ${addresses.regtest.bech32[0].slice(0, 20)}`
    );
  });

  test('Should be able to create an blech32 address', () => {
    const address = Address.create(addresses.regtest.blech32[0]);
    expect(address.value).toContain(addresses.regtest.blech32[0]);
    //
    expect(() => Address.create(addresses.regtest.blech32[0].slice(0, 20))).toThrow('decode');
  });
});

describe('Address - Liquid', () => {
  test('Should be able to create an legacy address', () => {
    const address = Address.create(addresses.liquid.legacy[0]);
    expect(address.value).toContain(addresses.liquid.legacy[0]);
    //
    expect(() => Address.create(addresses.liquid.legacy[0].slice(0, 20))).toThrow(
      'Invalid checksum'
    );
  });

  test('Should be able to create an np2sh address', () => {
    const address = Address.create(addresses.liquid.np2sh[0]);
    expect(address.value).toContain(addresses.liquid.np2sh[0]);
    //
    expect(() => Address.create(addresses.liquid.np2sh[0].slice(0, 20))).toThrow(
      'Invalid checksum'
    );
  });

  test('Should be able to create an bech32 address', () => {
    const address = Address.create(addresses.liquid.bech32[0]);
    expect(address.value).toContain(addresses.liquid.bech32[0]);
    //
    expect(() => Address.create(addresses.liquid.bech32[0].slice(0, 20))).toThrow(
      `Invalid checksum for ${addresses.liquid.bech32[0].slice(0, 20)}`
    );
  });

  test('Should be able to create an blech32 address', () => {
    const address = Address.create(addresses.liquid.blech32[0]);
    expect(address.value).toContain(addresses.liquid.blech32[0]);
    //
    expect(() => Address.create(addresses.liquid.blech32[0].slice(0, 20))).toThrow('decode');
  });
});
