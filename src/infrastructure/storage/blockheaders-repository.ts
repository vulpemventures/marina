import Browser from 'webextension-polyfill';
import type { NetworkString } from 'marina-provider';
import type { BlockheadersRepository } from '../../domain/repository';
import { DynamicStorageKey } from './dynamic-key';
import type { BlockHeader } from '../../domain/chainsource';

const BlockHeaderKey = new DynamicStorageKey<[network: NetworkString, height: number]>(
  'blockheader'
);

export class BlockHeadersAPI implements BlockheadersRepository {
  async getBlockHeader(network: NetworkString, height: number): Promise<BlockHeader | undefined> {
    const key = BlockHeaderKey.make(network, height);
    const { [key]: blockHeader } = await Browser.storage.local.get(key);
    return blockHeader === null ? undefined : blockHeader;
  }

  setBlockHeaders(network: NetworkString, ...blockHeaders: BlockHeader[]): Promise<void> {
    return Browser.storage.local.set(
      blockHeaders.reduce((acc, blockHeader) => {
        const key = BlockHeaderKey.make(network, blockHeader.height);
        acc[key] = blockHeader;
        return acc;
      }, {} as Record<string, BlockHeader>)
    );
  }
}
