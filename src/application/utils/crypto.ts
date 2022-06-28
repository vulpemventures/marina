import * as crypto from 'crypto';
import type { EncryptedMnemonic } from '../../domain/encrypted-mnemonic';
import { createEncryptedMnemonic } from '../../domain/encrypted-mnemonic';
import type { Mnemonic } from '../../domain/mnemonic';
import { createMnemonic } from '../../domain/mnemonic';
import type { Password } from '../../domain/password';
import type { PasswordHash } from '../../domain/password-hash';
import { createPasswordHash } from '../../domain/password-hash';
import { INVALID_PASSWORD_ERROR } from './constants';

const iv = Buffer.alloc(16, 0);
export function encrypt(payload: Mnemonic, password: Password): EncryptedMnemonic {
  const hash = crypto.createHash('sha1').update(password);
  const secret = hash.digest().slice(0, 16);
  const key = crypto.createCipheriv('aes-128-cbc', secret, iv);
  let encrypted = key.update(payload, 'utf8', 'hex');
  encrypted += key.final('hex');
  return createEncryptedMnemonic(encrypted);
}

export function decrypt(encrypted: EncryptedMnemonic, password: Password): Mnemonic {
  try {
    const hash = crypto.createHash('sha1').update(password);
    const secret = hash.digest().slice(0, 16);
    const key = crypto.createDecipheriv('aes-128-cbc', secret, iv);
    let decrypted = key.update(encrypted, 'hex', 'utf8');
    decrypted += key.final('utf8');
    return createMnemonic(decrypted);
  } catch {
    throw new Error(INVALID_PASSWORD_ERROR);
  }
}

export function sha256Hash(str: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function hashPassword(text: Password): PasswordHash {
  return createPasswordHash(sha256Hash(text));
}
