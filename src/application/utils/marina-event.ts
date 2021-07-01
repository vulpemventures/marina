import { Outpoint, toOutpoint, UtxoInterface } from 'ldk';
import { TxDisplayInterface, TxsHistory } from '../../domain/transaction';

export enum MarinaEventType {
	NEW_UTXO,
	SPENT_UTXO,
	NEW_TX,

	UNKNOWN
}

export interface MarinaEvent<P extends any> {
	type: MarinaEventType;
	payload: P;
}

export type NewUtxoMarinaEvent = MarinaEvent<UtxoInterface>;
export type SpentUtxoMarinaEvent = MarinaEvent<Outpoint>;
export type NewTxMarinaEvent = MarinaEvent<TxDisplayInterface>;

export function compareTxsHistoryState(oldState: TxsHistory, newState: TxsHistory): NewTxMarinaEvent[] {
	const events: NewTxMarinaEvent[] = [];
	const newEntries = Object.entries(newState);
	const oldTxIDs = Object.keys(oldState);

	for (const [txID, tx] of newEntries) {
		if (oldTxIDs.includes(txID)) continue;
		events.push({ type: MarinaEventType.NEW_TX, payload: tx })
	}

	return events;
}

export function compareUtxoState(oldState: Record<string, UtxoInterface>, newState: Record<string, UtxoInterface>): (NewUtxoMarinaEvent | SpentUtxoMarinaEvent)[] {
	const events: (NewUtxoMarinaEvent | SpentUtxoMarinaEvent)[] = [];
	const newEntries = Object.entries(newState);
	const oldOutpointStrings = Object.keys(oldState);

	for (const [outpointStr, utxo] of newEntries) {
		const oldStateHasUtxo = oldOutpointStrings.includes(outpointStr);
		if (!oldStateHasUtxo) {
			events.push({ type: MarinaEventType.NEW_UTXO, payload: utxo })
		}
	}

	const newOutpointStrings = Object.keys(newState);

	for (const [outpointStr, utxo] of Object.entries(oldState)) {
		if (!newOutpointStrings.includes(outpointStr)) {
			events.push({ type: MarinaEventType.SPENT_UTXO, payload: toOutpoint(utxo) })
		}
	}

	return events;
}