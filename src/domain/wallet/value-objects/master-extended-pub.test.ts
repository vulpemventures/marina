import { MasterXPub } from './master-extended-pub';

const masterXPub =
  'vpub5SLqN2bLY4WeZs98bUbZ5xyHcL6K7UaQu2bwPD8Mo7KBhn2t5oryZHkmT4SJ8Btfp1CW9SaRRawkGoFTLbBMUhmyPM7G91MLEkGEoyVo4x8';

test('Should be able to create a MasterXPub', () => {
  const res = MasterXPub.create(masterXPub);
  expect(res.value).toContain(masterXPub);
  //
  expect(() => MasterXPub.create('invalidMasterXPub')).toThrow(
    "Invalid extended public key! Please double check that you didn't accidentally paste extra data."
  );
});
