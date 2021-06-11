import { RootReducerState } from '../../../domain/common';
import { TxDisplayInterface } from '../../../domain/transaction';
import { toDisplayTransaction } from '../../utils';
import { walletScripts } from './wallet.selector';

export function walletTransactions(state: RootReducerState): TxDisplayInterface[] {
  const scripts = walletScripts(state);
  const txs = Object.values(state.txsHistory[state.app.network]);
  return txs.map((tx) => toDisplayTransaction(tx, scripts));
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
