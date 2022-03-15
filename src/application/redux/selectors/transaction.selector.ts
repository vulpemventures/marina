import type { TxDisplayInterface } from '../../../domain/transaction';

export const txHasAsset =
  (assetHash: string) =>
  (tx: TxDisplayInterface): boolean => {
    return tx.transfers.map((t) => t.asset).includes(assetHash);
  };
