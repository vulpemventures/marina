import type { MarinaEventType, NetworkString } from 'marina-provider';
import { TxDetails, UnblindedOutput } from '../domain/transaction';

export interface MarinaEvent<P extends any> {
  type: MarinaEventType;
  payload: P;
}

export type NewUtxoMarinaEvent = MarinaEvent<{ data: UnblindedOutput }>;
export type SpentUtxoMarinaEvent = MarinaEvent<{ data: UnblindedOutput }>;
export type NewTxMarinaEvent = MarinaEvent<{ data: { txID: string, details: TxDetails } }>;
export type EnabledMarinaEvent = MarinaEvent<{
  data: { hostname: string; network: NetworkString };
}>;
export type DisabledMarinaEvent = MarinaEvent<{
  data: { hostname: string; network: NetworkString };
}>;
export type NetworkMarinaEvent = MarinaEvent<{ data: NetworkString }>;