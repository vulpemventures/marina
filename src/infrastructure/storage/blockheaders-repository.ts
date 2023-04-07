import Browser from 'webextension-polyfill';
import type { NetworkString } from 'marina-provider';
import type { BlockheadersRepository } from '../../domain/repository';
import { DynamicStorageKey } from './dynamic-key';
import type { BlockHeader } from '../../domain/chainsource';

const BlockHeaderKey = new DynamicStorageKey<[network: NetworkString, height: number]>(
  'blockheader'
);

export class BlockHeadersAPI implements BlockheadersRepository {
  async getAllBlockHeaders(network: NetworkString): Promise<Record<number, BlockHeader>> {
    const all = await Browser.storage.local.get(null);
    const blockHeadersKey = Object.keys(all).filter(
      (key) => BlockHeaderKey.is(key) && BlockHeaderKey.decode(key)[0] === network
    );
    return blockHeadersKey.reduce((acc, key) => {
      const [, height] = BlockHeaderKey.decode(key);
      acc[height] = all[key];
      return acc;
    }, {} as Record<number, BlockHeader>);
  }

  onNewBlockHeader(callback: (network: NetworkString, blockHeader: BlockHeader) => Promise<void>) {
    const listener = async (
      changes: Record<string, Browser.Storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      for (const key of Object.keys(changes)) {
        if (BlockHeaderKey.is(key)) {
          const [network] = BlockHeaderKey.decode(key);
          await callback(network, changes[key].newValue);
        }
      }
    };
    Browser.storage.onChanged.addListener(listener);
    return () => Browser.storage.onChanged.removeListener(listener);
  }

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
