import { PasswordHash } from './password-hash';

test('Should be able to create a password hash', () => {
  const passwordHash = PasswordHash.create(
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
  );
  expect(passwordHash.value).toContain(
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
  );
});

test('Should be equal to 64 chars', () => {
  expect(() => PasswordHash.create('notlongenough')).toThrow('PasswordHash must be 64 chars');
});
