import * as crypto from 'crypto';

const iv = Buffer.alloc(16, 0);
export function encrypt(payload: string, password: string): string {
  const hash = crypto.createHash('sha1').update(password);

  const secret = hash.digest().slice(0, 16);
  const key = crypto.createCipheriv('aes-128-cbc', secret, iv);
  let encrypted = key.update(payload, 'utf8', 'hex');
  encrypted += key.final('hex');

  return encrypted;
}

export function decrypt(encrypted: string, password: string): string {
  const hash = crypto.createHash('sha1').update(password);

  const secret = hash.digest().slice(0, 16);
  const key = crypto.createDecipheriv('aes-128-cbc', secret, iv);
  let decrypted = key.update(encrypted, 'hex', 'utf8');
  decrypted += key.final('utf8');

  return decrypted;
}

export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}