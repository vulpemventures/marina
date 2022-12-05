import type { TxInterface } from 'ldk';
import { AssetHash } from 'ldk';

export const txHasAsset =
  (assetHash: string) =>
  (tx: TxInterface): boolean => {
    return (
      tx.vin.some(
        (input) =>
          input.prevout && AssetHash.fromBytes(input.prevout.prevout.asset).hex === assetHash
      ) || tx.vout.some((output) => AssetHash.fromBytes(output.prevout.asset).hex === assetHash)
    );
  };
