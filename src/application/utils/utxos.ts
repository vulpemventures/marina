import type { UnblindedOutput} from 'ldk';
import { unblindOutput } from 'ldk';
import { Transaction } from 'liquidjs-lib';
import type { UnconfirmedOutput } from '../../domain/unconfirmed';

export const toStringOutpoint = (outpoint: { txid: string; vout: number }) => {
  return `${outpoint.txid}:${outpoint.vout}`;
};

// for each unconfirmed output get unblindData and return utxo
export const makeUnconfirmedUtxos = async (
  txHex: string,
  unconfirmedOutputs: UnconfirmedOutput[]
): Promise<UnblindedOutput[]> => {
  const unconfirmedUtxos: UnblindedOutput[] = [];
  const transaction = Transaction.fromHex(txHex);
  for (const { txid, vout, blindPrivKey } of unconfirmedOutputs) {
    const prevout = transaction.outs[vout];
    const utxo = await unblindOutput({ txid, vout, prevout }, blindPrivKey);
    unconfirmedUtxos.push(utxo);
  }
  return unconfirmedUtxos;
};
