import { isValidXpub, toXpub } from 'ldk';

export type MasterXPub = string;

export function createMasterXPub(masterXPub: string): MasterXPub {
  if (isValidXpub(toXpub(masterXPub))) {
    return masterXPub;
  } else {
    throw new Error('MasterXPub is invalid');
  }
}
