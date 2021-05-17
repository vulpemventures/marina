import { isValidExtendedBlindKey } from 'ldk';

export type MasterBlindingKey = string;

export function createMasterBlindingKey(masterBlindingKey: string): MasterBlindingKey {
  if (isValidExtendedBlindKey(masterBlindingKey)) {
    return masterBlindingKey
  } else {
    throw new Error('MasterBlindingKey is invalid');
  }
}

