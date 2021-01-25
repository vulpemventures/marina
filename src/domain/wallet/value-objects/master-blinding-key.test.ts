import { MasterBlindingKey } from './master-blinding-key';
import { masterBlindingKey } from '../../../../__test__/fixtures/wallet.json';

test('Should be able to create a master blinding key', () => {
  const res = MasterBlindingKey.create(masterBlindingKey);
  expect(res.value).toContain(masterBlindingKey);
  //
  expect(() => MasterBlindingKey.create('badMasterBlindingKey')).toThrow();
});
