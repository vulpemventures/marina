import { RootReducerState } from '../../../domain/common';
import { TxDisplayInterface } from '../../../domain/transaction';

export function walletTransactions(state: RootReducerState): TxDisplayInterface[] {
  const txs = Object.values(state.txsHistory[state.app.network]);
  console.log('txs', txs)
  return txs;
}

export const txHasAsset = (assetHash: string) => (tx: TxDisplayInterface) => {
  return tx.transfers.map((t) => t.asset).includes(assetHash);
};

export function getOutputsAddresses(state: RootReducerState): string[] {
  const txState = state.transaction;
  const addresses = [txState.changeAddress, txState.feeChangeAddress, txState.sendAddress];

  const result: string[] = [];
  for (const addr of addresses) {
    if (addr) {
      result.push(addr.value);
    }
  }

  return result;
}
