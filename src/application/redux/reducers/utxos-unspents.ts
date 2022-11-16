import { crypto, NetworkString, UnblindedOutput } from "ldk";
import { AccountID } from "marina-provider";
import { MainAccountID } from "../../../domain/account";
import { TxDisplayInterface } from "../../../domain/transaction";
import { UtxosTransactionsState } from "../../../domain/wallet";
import { toStringOutpoint } from "../../utils/utxos";
import * as ACTION_TYPES from "../actions/action-types";

export const utxosTransactionsInitialState: UtxosTransactionsState = {
    utxos: {
        regtest: { [MainAccountID]: {} },
        testnet: { [MainAccountID]: {} },
        liquid: { [MainAccountID]: {} },
    },
    transactions: {
        regtest: { [MainAccountID]: {} },
        testnet: { [MainAccountID]: {} },
        liquid: { [MainAccountID]: {} },
    },
}

export const utxosAndTransactionsReducer = (
    state: UtxosTransactionsState = utxosTransactionsInitialState,
    action: any
): UtxosTransactionsState => {
    const payload = action.payload;

    switch (action.type) {
        case ACTION_TYPES.ADD_UTXO: {
            return addUnspent(state)(payload.accountID, payload.utxo, payload.network);
        }

        case ACTION_TYPES.DELETE_UTXO: {
            return deleteUnspent(state)(payload.accountID, payload.txid, payload.vout, payload.network);
        }

        case ACTION_TYPES.SET_ACCOUNT_DATA: {
            const accountID = payload.accountID as AccountID;
            return {
                ...state,
                utxos: {
                    ...state.utxos,
                    liquid: {
                        ...state.utxos.liquid,
                        [accountID]: {},
                    },
                    regtest: {
                        ...state.utxos.regtest,
                        [accountID]: {},
                    },
                    testnet: {
                        ...state.utxos.testnet,
                        [accountID]: {},
                    },
                }
            }
        }

        case ACTION_TYPES.ADD_UNCONFIRMED_UTXOS: {
            const { unconfirmedUtxos, accountID, network } = payload;
            return addUnconfirmed(state)(unconfirmedUtxos, accountID, network);
        }

        case ACTION_TYPES.ADD_TX: {
            return addTx(state)(payload.accountID, payload.tx, payload.network);
        }

        case ACTION_TYPES.FLUSH_UTXOS: {
            const accountID = payload.accountID as AccountID;
            const net = payload.network as NetworkString;
            return {
                ...state,
                utxos: {
                    ...state.utxos,
                    [net]: { ...state.utxos[net], [accountID]: {} },
                },
            };
        }

        case ACTION_TYPES.ADD_SCRIPT_HASH: {
            const accountID = payload.accountID as AccountID;
            const net = payload.network as NetworkString;
            const scriptHash = payload.scriptHash as string;
            return {
                ...state,
                utxos: {
                    ...state.utxos,
                    [net]: {
                        ...state.utxos[net],
                        [accountID]: {
                            ...state.utxos[net][accountID],
                            [scriptHash]: {
                                ...state.utxos[net][accountID][scriptHash],
                            },
                        },
                    },
                },
            }
        }

        default:
            return state;
    }
}

function deleteUnspent(state: UtxosTransactionsState) {
    return (accountID: AccountID, txid: string, vout: number, network: NetworkString): UtxosTransactionsState => {
        if (!state.utxos[network][accountID]) {
            return state;
        }
        const strOutpoint = toStringOutpoint({ txid, vout });
        const accountIDState = state.utxos[network][accountID];

        // remove the outpoint from the utxosMap
        for (const scriptHash in accountIDState) {
            const scriptHashState = accountIDState[scriptHash];
            const { [strOutpoint]: deleted, ...utxosMap } = scriptHashState;
            if (deleted) {
                return {
                    ...state,
                    utxos: {
                        ...state.utxos,
                        [network]: {
                            ...state.utxos[network],
                            [accountID]: {
                                ...state.utxos[network][accountID],
                                [scriptHash]: utxosMap,
                            },
                        },
                    },
                };
            }
        }
        return state;
    }
}

function addUnspent(state: UtxosTransactionsState) {
    return (accountID: AccountID, utxo: UnblindedOutput, network: NetworkString): UtxosTransactionsState => {
        const scriptHash = crypto.sha256(utxo.prevout.script).reverse().toString('hex')
        return {
            ...state,
            utxos: {
                ...state.utxos,
                [network]: {
                    ...state.utxos[network],
                    [accountID]: {
                        ...state.utxos[network][accountID],
                        [scriptHash]: {
                            ...state.utxos[network][accountID][scriptHash],
                            [toStringOutpoint(utxo)]: utxo
                        }
                    }
                },
            },
        };
    };
}

function addTx(state: UtxosTransactionsState) {
    return (accountID: AccountID, tx: TxDisplayInterface, network: NetworkString): UtxosTransactionsState => {
        return {
            ...state,
            transactions: {
                ...state.transactions,
                [network]: {
                    ...state.transactions[network],
                    [accountID]: {
                        ...state.transactions[network][accountID],
                        [tx.txId]: tx,
                    },
                },
            },
        };
    }
}

function addUnconfirmed(state: UtxosTransactionsState) {
    return (
        unconfirmedUtxos: UnblindedOutput[],
        accountID: AccountID,
        network: NetworkString
    ): UtxosTransactionsState => {
        const unconfirmedUtxosMap: Record<string, UnblindedOutput> = {};
        for (const utxo of unconfirmedUtxos) {
            unconfirmedUtxosMap[toStringOutpoint(utxo)] = utxo;
        }
        return {
            ...state,
            utxos: {
                ...state.utxos,
                [network]: {
                    ...state.utxos[network],
                    [accountID]: {
                        ...state.utxos[network][accountID],
                        unconfirmedUtxosMap,
                    },
                },
            },
        };

    };
}