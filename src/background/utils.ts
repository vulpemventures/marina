import Browser from 'webextension-polyfill';

export interface BlockHeader {
  version: number;
  previousBlockHash: string;
  merkleRoot: string;
  timestamp: number;
  height: number;
}

const DYNAFED_HF_MASK = 2147483648;

export function deserializeBlockHeader(hex: string): BlockHeader {
  const buffer = Buffer.from(hex, 'hex');
  let offset = 0;

  let version = buffer.readUInt32LE(offset);
  offset += 4;

  const isDyna = (version & DYNAFED_HF_MASK) !== 0;
  if (isDyna) {
    version = version & ~DYNAFED_HF_MASK;
  }

  const previousBlockHash = buffer
    .subarray(offset, offset + 32)
    .reverse()
    .toString('hex');
  offset += 32;

  const merkleRoot = buffer.subarray(offset, offset + 32).toString('hex');
  offset += 32;

  const timestamp = buffer.readUInt32LE(offset);
  offset += 4;

  const height = buffer.readUInt32LE(offset);
  offset += 4;

  return {
    version,
    previousBlockHash,
    merkleRoot,
    timestamp,
    height,
  };
}

export async function tabIsOpen(tabID: number): Promise<boolean> {
  const tabs = await Browser.tabs.query({ currentWindow: true });
  for (const { id } of tabs) {
    if (id && id === tabID) return true;
  }
  return false;
}
