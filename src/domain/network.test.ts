import { createNetwork } from './network';

test('Should be able to create a Network', () => {
  const liquid = createNetwork('liquid');
  expect(liquid).toContain('liquid');
  const regtest = createNetwork('regtest');
  expect(regtest).toContain('regtest');
});

test('Should be equal to liquid or regtest', () => {
  expect(() => createNetwork('testnet')).toThrow('Network must be either liquid or regtest');
});
