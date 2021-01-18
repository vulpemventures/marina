import { Address } from './address';

const addresses = {
  regtest: {
    legacy: ['CTEviFxyrgoFW8BC2wBYrJnyyTMmL3gqbWa46xoajv6NbaH8iGFumzN4m6GzTfUQXp2G9ndL2pREwufq'],
    np2sh: ['AzpqVYw5ERSbwVb9HWCSTWXNfh4T3o7j1a8ZeoVWQUPh7HrFAFmavEXDi2pceCYJS5pZUgAwgpVQjkYY'],
    bech32: ['ert1qpz4utqm5x4k3jt2g0yuhm38t5z5m0y5slmvj7p'],
    blech32: [
      'el1qqf6lcgvr8x9urumq4den2ps9h9qhp6qppxedprgx807tgtt425l7jt08fcnnte99dxchv447fu3s3wz3f2zz6srh8hpwtdmpl',
    ],
  },
  liquid: {
    legacy: ['VTpz1bNuCALgavJKgbAw9Lpp9A72rJy64XPqgqfnaLpMjRcFy6vHWKEeFbmcxvn7WjHNagxHnFaRcVuS'],
    np2sh: ['AzpqVYw5ERSbwVb9HWCSTWXNfh4T3o7j1a8ZeoVWQUPh7HrFAFmavEXDi2pceCYJS5pZUgAwgpVQjkYY'],
    bech32: ['ex1qsykf7fds7amffa950dufzkppzjn9esxpdk5c8z'],
    blech32: [
      'lq1qqf8er278e6nyvuwtgf39e6ewvdcnjupn9a86rzpx655y5lhkt0walu3djf9cklkxd3ryld97hu8h3xepw7sh2rlu7q45dcew5',
    ],
  },
};

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
