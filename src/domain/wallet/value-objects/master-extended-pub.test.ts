import { MasterXPub } from './master-extended-pub';
import { masterXPub } from '../../../infrastructure/fixtures/wallet.json';

test('Should be able to create a MasterXPub', () => {
  const res = MasterXPub.create(masterXPub);
  expect(res.value).toContain(masterXPub);
  //
  expect(() => MasterXPub.create('invalidMasterXPub')).toThrow(
    "Invalid extended public key! Please double check that you didn't accidentally paste extra data."
  );
});
