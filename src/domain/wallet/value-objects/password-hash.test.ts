import { passwordHash as p } from '../../../../test/fixtures/wallet.json';
import { createPasswordHash } from '../../password-hash';

test('Should be able to create a password hash', () => {
  const passwordHash = createPasswordHash(p);
  expect(passwordHash).toContain(p);
});

test('Should be equal to 64 chars', () => {
  expect(() => createPasswordHash('notlongenough')).toThrow('PasswordHash must be 64 chars');
});
