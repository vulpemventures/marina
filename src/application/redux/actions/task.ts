import type { NetworkString } from 'ldk';
import type { AccountID } from '../../../domain/account';
import type { ActionWithPayload } from '../../../domain/common';

export type UpdateTaskAction = ActionWithPayload<{ accountID: AccountID; network: NetworkString }>;
export type UpdateScriptTaskAction = ActionWithPayload<{
  scripthash: string;
  unspentState: Array<{ height: number; tx_hash: string; tx_pos: number }>;
  network: NetworkString;
}>;
export type FetchTxTaskAction = ActionWithPayload<{
  txid: string;
  network: NetworkString;
  accountID: AccountID;
  startAt: number;
}>;
