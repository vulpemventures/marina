import * as crypto from 'crypto';
import {
  EncryptedMnemonic,
  Mnemonic,
  Password,
  PasswordHash,
} from '../../domain/wallet/value-objects';

const iv = Buffer.alloc(16, 0);
export function encrypt(payload: Mnemonic, password: Password): EncryptedMnemonic {
  const hash = crypto.createHash('sha1').update(password.value);
  const secret = hash.digest().slice(0, 16);
  const key = crypto.createCipheriv('aes-128-cbc', secret, iv);
  let encrypted = key.update(payload.value, 'utf8', 'hex');
  encrypted += key.final('hex');
  return EncryptedMnemonic.create(encrypted);
}

export function decrypt(encrypted: EncryptedMnemonic, password: Password): Mnemonic {
  const hash = crypto.createHash('sha1').update(password.value);
  const secret = hash.digest().slice(0, 16);
  const key = crypto.createDecipheriv('aes-128-cbc', secret, iv);
  let decrypted = key.update(encrypted.value, 'hex', 'utf8');
  decrypted += key.final('utf8');
  return Mnemonic.create(decrypted);
}

export function hash(text: Password): PasswordHash {
  return PasswordHash.create(crypto.createHash('sha256').update(text.value).digest('hex'));
}
