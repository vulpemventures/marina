import * as crypto from 'crypto';
import { scrypt } from 'scrypt-js';
import { INVALID_PASSWORD_ERROR } from './constants';

export const N = 16384;
export const r = 8;
export const p = 1;
export const klen = 32;

export interface Encrypted {
  data: string;
  options: ScryptOptions;
}

export interface ScryptOptions {
  salt: string;
  N: number;
  r: number;
  p: number;
  klen: number;
}

function defaultScryptOptions(): ScryptOptions {
  return {
    N: 16384,
    r: 8,
    p: 1,
    klen: 32,
    salt: randomSalt(32),
  };
}

function randomSalt(length: number): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const iv = 'f341557fcf9b9286';

/**
 * encrypt data using scrypt + aes256-cbc
 * @param payload
 * @param password
 */
export async function encrypt(payload: string, password: string): Promise<Encrypted> {
  const options = defaultScryptOptions();
  const passwordDerived = await passwordToKey(password, options);
  const key = crypto.createCipheriv('aes-256-cbc', passwordDerived, iv);
  let encrypted = key.update(payload, 'utf8', 'base64');
  encrypted += key.final('base64');
  return {
    data: encrypted,
    options,
  };
}

/**
 * Decrypt data using aes-256 & scrypt
 * @param encryptedData encrypted data to decrypt
 * @param password password using to decrypt
 */
export async function decrypt(encryptedData: Encrypted, password: string): Promise<string> {
  try {
    const passwordDerived = await passwordToKey(password, encryptedData.options);
    const key = crypto.createDecipheriv('aes-256-cbc', passwordDerived, iv);
    let decrypted = key.update(encryptedData.data, 'base64', 'utf8');
    decrypted += key.final('utf8');
    return decrypted;
  } catch {
    throw new Error(INVALID_PASSWORD_ERROR);
  }
}

async function passwordToKey(password: string, options: ScryptOptions): Promise<Uint8Array> {
  return scrypt(
    prepareForScrypt(password),
    prepareForScrypt(options.salt),
    options.N,
    options.r,
    options.p,
    options.klen
  );
}

function prepareForScrypt(str: string): Uint8Array {
  return Buffer.from(str.normalize('NFKD'));
}
