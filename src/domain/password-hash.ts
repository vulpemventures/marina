import { hash } from '../application/utils';
import { Password } from './password';

export type PasswordHash = string;

export function match(password: Password, passwordHash: PasswordHash) {
  return hash(password) === passwordHash;
}

export function createPasswordHash(passwordHash: string): PasswordHash {
  if (passwordHash === undefined || passwordHash === null || passwordHash.length !== 64) {
    throw new Error('PasswordHash must be 64 chars');
  } else {
    return passwordHash;
  }
}
