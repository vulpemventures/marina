import { EncryptedMnemonic } from './encrypted-mnemonic';

const encryptedMnemonic =
  '0acbebbafe859c4f40f21d12aba8d7aff8915f799b6e30bbe102d1f5e1ce72bf2b54d5e2c088557bd35c9767fb86842db0f61a07ae0ddab8dbf8ffd4ab879ea5af60fe51b638125fd83a709e01d887f9';

test('Should be able to create an encrypted mnemonic', () => {
  const res = EncryptedMnemonic.create(encryptedMnemonic);
  expect(res.value).toContain(encryptedMnemonic);
  //
  expect(() => EncryptedMnemonic.create('invalidEncryptedMnemonic')).toThrow(
    'Encrypted mnemonic must be 160 chars'
  );
});
