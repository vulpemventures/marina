import type { NetworkString, Outpoint, UnblindedOutput } from 'ldk';
import type { TxDisplayInterface, TxsHistory } from '../../domain/transaction';
import type { MarinaEventType } from 'marina-provider';

export interface MarinaEvent<P extends any> {
  type: MarinaEventType;
  payload: P;
}

export type NewUtxoMarinaEvent = MarinaEvent<{ utxo: UnblindedOutput; accountID: string }>;
export type SpentUtxoMarinaEvent = MarinaEvent<{ utxo: Outpoint; accountID: string }>;
export type NewTxMarinaEvent = MarinaEvent<{ tx: TxDisplayInterface; accountID: string }>;
export type EnabledMarinaEvent = MarinaEvent<{ network: NetworkString; hostname: string }>;
export type DisabledMarinaEvent = MarinaEvent<{ network: NetworkString; hostname: string }>;
export type NetworkMarinaEvent = MarinaEvent<NetworkString>;

// compare tx history states and return marina events
export function compareTxsHistoryState(
  oldState: TxsHistory,
  newState: TxsHistory,
  accountID: string
): NewTxMarinaEvent[] {
  const events: NewTxMarinaEvent[] = [];
  const newEntries = Object.entries(newState);
  const oldTxIDs = Object.keys(oldState);

  for (const [txID, tx] of newEntries) {
    if (oldTxIDs.includes(txID)) continue;
    events.push({ type: 'NEW_TX', payload: { tx, accountID } });
  }

  return events;
}

// compare two utxo state and return marina events
export function compareUtxoState(
  oldState: Record<string, UnblindedOutput>,
  newState: Record<string, UnblindedOutput>,
  accountID: string
): (NewUtxoMarinaEvent | SpentUtxoMarinaEvent)[] {
  const events: (NewUtxoMarinaEvent | SpentUtxoMarinaEvent)[] = [];
  const newEntries = Object.entries(newState);
  const oldOutpointStrings = Object.keys(oldState);

  for (const [outpointStr, utxo] of newEntries) {
    const oldStateHasUtxo = oldOutpointStrings.includes(outpointStr);
    if (!oldStateHasUtxo) {
      events.push({ type: 'NEW_UTXO', payload: { utxo, accountID } });
    }
  }

  const newOutpointStrings = Object.keys(newState);

  for (const [outpointStr, utxo] of Object.entries(oldState)) {
    if (!newOutpointStrings.includes(outpointStr)) {
      events.push({ type: 'SPENT_UTXO', payload: { utxo, accountID } });
    }
  }

  return events;
}

export function compareEnabledWebsites(
  oldState: Record<NetworkString, string[]>,
  newState: Record<NetworkString, string[]>,
  currentHostname: string
) {
  const events: (DisabledMarinaEvent | EnabledMarinaEvent)[] = [];

  for (const network of ['liquid', 'regtest', 'testnet'] as NetworkString[]) {
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

export function networkChange(
  oldNetwork: NetworkString,
  newNetwork: NetworkString
): NetworkMarinaEvent[] {
  if (oldNetwork !== newNetwork) return [{ type: 'NETWORK', payload: newNetwork }];
  else return [];
}
