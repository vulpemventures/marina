import * as crypto from 'crypto';
import { createEncryptedMnemonic, EncryptedMnemonic } from '../../domain/encrypted-mnemonic';
import { createMnemonic, Mnemonic } from '../../domain/mnemonic';
import { Password } from '../../domain/password';
import { createPasswordHash, PasswordHash } from '../../domain/password-hash';

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
  const hash = crypto.createHash('sha1').update(password);
  const secret = hash.digest().slice(0, 16);
  const key = crypto.createDecipheriv('aes-128-cbc', secret, iv);
  let decrypted = key.update(encrypted, 'hex', 'utf8');
  decrypted += key.final('utf8');
  return createMnemonic(decrypted);
}

export function sha256Hash(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export function hashPassword(text: Password): PasswordHash {
  return createPasswordHash(sha256Hash(text));
}
