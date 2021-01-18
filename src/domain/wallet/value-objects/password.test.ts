import { Password } from './password';

test('Should be able to create a password', () => {
  const password = Password.create('pass1234');
  expect(password.value).toContain('pass1234');
});

test('Should be equal or more than 8 chars', () => {
  expect(() => Password.create('pass')).toThrow('Password must be 8 chars min');
});
