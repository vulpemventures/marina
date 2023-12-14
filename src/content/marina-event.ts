import type { MarinaEventType, NetworkString, Utxo } from 'marina-provider';
import type { TxDetails } from '../domain/transaction';

export interface MarinaEvent<P extends any> {
  type: MarinaEventType;
  payload: P;
}

export type NewUtxoMarinaEvent = MarinaEvent<{ data: Utxo }>;
export type SpentUtxoMarinaEvent = MarinaEvent<{ data: Utxo }>;
export type NewTxMarinaEvent = MarinaEvent<{ data: { txID: string; details: TxDetails } }>;
export type EnabledMarinaEvent = MarinaEvent<{
  data: { hostname: string; network: NetworkString };
}>;
export type DisabledMarinaEvent = MarinaEvent<{
  data: { hostname: string; network: NetworkString };
}>;
export type NetworkMarinaEvent = MarinaEvent<{ data: NetworkString }>;
