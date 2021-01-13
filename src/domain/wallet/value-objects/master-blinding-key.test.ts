import { MasterBlindingKey } from './master-blinding-key';

const masterBlindingKey = '0af7c655f41066b868ad997a1e0d67f5aeb1dc5ee0e8fe132b6c5c8a414dcaf8';

test('Should be able to create a master blinding key', () => {
  const res = MasterBlindingKey.create(masterBlindingKey);
  expect(res.value).toContain(masterBlindingKey);
  //
  expect(() => MasterBlindingKey.create('badMasterBlindingKey')).toThrow();
});
