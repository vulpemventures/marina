import { Network } from './network';

test('Should be able to create a Network', () => {
  const liquid = Network.create('liquid');
  expect(liquid.value).toContain('liquid');
  const regtest = Network.create('regtest');
  expect(regtest.value).toContain('regtest');
});

test('Should be equal to liquid or regtest', () => {
  // @ts-ignore
  expect(() => Network.create('testnet')).toThrow('Network must be either liquid or regtest');
});
