import { PasswordHash } from './password-hash';
import { passwordHash as p } from '../../../../__test__/fixtures/wallet.json';

test('Should be able to create a password hash', () => {
  const passwordHash = PasswordHash.create(p);
  expect(passwordHash.value).toContain(p);
});

test('Should be equal to 64 chars', () => {
  expect(() => PasswordHash.create('notlongenough')).toThrow('PasswordHash must be 64 chars');
});
