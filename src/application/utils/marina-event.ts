import { Network } from './../../domain/network';
import { Outpoint, toOutpoint, UtxoInterface } from 'ldk';
import { TxDisplayInterface, TxsHistory } from '../../domain/transaction';
import { MarinaEventType } from 'marina-provider';

export interface MarinaEvent<P extends any> {
  type: MarinaEventType;
  payload: P;
}

export type NewUtxoMarinaEvent = MarinaEvent<UtxoInterface>;
export type SpentUtxoMarinaEvent = MarinaEvent<Outpoint>;
export type NewTxMarinaEvent = MarinaEvent<TxDisplayInterface>;
export type EnabledMarinaEvent = MarinaEvent<{ network: Network; hostname: string }>;
export type DisabledMarinaEvent = MarinaEvent<{ network: Network; hostname: string }>;

// compare tx history states and return marina events
export function compareTxsHistoryState(
  oldState: TxsHistory,
  newState: TxsHistory
): NewTxMarinaEvent[] {
  const events: NewTxMarinaEvent[] = [];
  const newEntries = Object.entries(newState);
  const oldTxIDs = Object.keys(oldState);

  for (const [txID, tx] of newEntries) {
    if (oldTxIDs.includes(txID)) continue;
    events.push({ type: 'NEW_TX', payload: tx });
  }

  return events;
}

// compare two utxo state and return marina events
export function compareUtxoState(
  oldState: Record<string, UtxoInterface>,
  newState: Record<string, UtxoInterface>
): (NewUtxoMarinaEvent | SpentUtxoMarinaEvent)[] {
  const events: (NewUtxoMarinaEvent | SpentUtxoMarinaEvent)[] = [];
  const newEntries = Object.entries(newState);
  const oldOutpointStrings = Object.keys(oldState);

  for (const [outpointStr, utxo] of newEntries) {
    const oldStateHasUtxo = oldOutpointStrings.includes(outpointStr);
    if (!oldStateHasUtxo) {
      events.push({ type: 'NEW_UTXO', payload: utxo });
    }
  }

  const newOutpointStrings = Object.keys(newState);

  for (const [outpointStr, utxo] of Object.entries(oldState)) {
    if (!newOutpointStrings.includes(outpointStr)) {
      events.push({ type: 'SPENT_UTXO', payload: toOutpoint(utxo) });
    }
  }

  return events;
}

export function compareEnabledWebsites(
  oldState: Record<Network, string[]>,
  newState: Record<Network, string[]>,
  currentHostname: string,
) {
  const events: (DisabledMarinaEvent | EnabledMarinaEvent)[] = [];

  for (const network of ['liquid', 'regtest'] as Network[]) {
    const oldHostnames = oldState[network];
    const newHostnames = newState[network];

    for (const hostname of newHostnames) {
      if (!oldHostnames.includes(hostname)) {
        events.push({ type: 'ENABLED', payload: { network, hostname } });
      }
    }

    for (const hostname of oldHostnames) {
      if (!newHostnames.includes(hostname)) {
        events.push({ type: 'DISABLED', payload: { network, hostname } });
      }
    }
  }

  return events.filter((ev) => ev.payload.hostname === currentHostname);
}
