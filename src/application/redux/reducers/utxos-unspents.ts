import type { NetworkString, UnblindedOutput } from 'ldk';
import { crypto } from 'ldk';
import type { AccountID } from 'marina-provider';
import { MainAccountID } from '../../../domain/account';
import type { TxDisplayInterface } from '../../../domain/transaction';
import { TxStatusEnum } from '../../../domain/transaction';
import type { UtxosTransactionsState } from '../../../domain/wallet';
import { toStringOutpoint } from '../../utils/utxos';
import * as ACTION_TYPES from '../actions/action-types';

// minimum time utxos are locked (5 minutes)
const lockedUtxoMinimumTime = 300_000;

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
  lockedUtxos: {},
};

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
        },
      };
    }

    case ACTION_TYPES.ADD_UNCONFIRMED_UTXOS: {
      const { unconfirmedUtxos, accountID, network } = payload;
      return addUnconfirmed(state)(unconfirmedUtxos, accountID, network);
    }

    case ACTION_TYPES.LOCK_UTXO: {
      const utxo = payload.utxo as UnblindedOutput;
      return {
        ...state,
        lockedUtxos: {
          ...state.lockedUtxos,
          [toStringOutpoint(utxo)]: Date.now(),
        },
      };
    }

    case ACTION_TYPES.UNLOCK_UTXOS: {
      const lockedUtxos = filterOnlyRecentLockedUtxos(state);
      return {
        ...state,
        lockedUtxos,
      };
    }

    case ACTION_TYPES.ADD_TX: {
      return addTx(state)(payload.accountID, payload.tx, payload.network);
    }

    case ACTION_TYPES.CONFIRM_TX: {
      const { txID, blocktime, network } = payload;
      return confirmTx(state)(txID, blocktime, network);
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
      };
    }

    case ACTION_TYPES.ONBOARDING_COMPLETETED: {
      return utxosTransactionsInitialState;
    }

    default:
      return state;
  }
};

function deleteUnspent(state: UtxosTransactionsState) {
  return (
    accountID: AccountID,
    txid: string,
    vout: number,
    network: NetworkString
  ): UtxosTransactionsState => {
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
  };
}

function addUnspent(state: UtxosTransactionsState) {
  return (
    accountID: AccountID,
    utxo: UnblindedOutput,
    network: NetworkString
  ): UtxosTransactionsState => {
    const scriptHash = crypto.sha256(utxo.prevout.script).reverse().toString('hex');
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
              [toStringOutpoint(utxo)]: utxo,
            },
          },
        },
      },
    };
  };
}

function addTx(state: UtxosTransactionsState) {
  return (
    accountID: AccountID,
    tx: TxDisplayInterface,
    network: NetworkString
  ): UtxosTransactionsState => {
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
  };
}

function confirmTx(state: UtxosTransactionsState) {
  return (txID: string, blocktime: number, network: NetworkString) => {
    // find the tx in the state
    const txState = state.transactions[network];
    for (const [accountID, txHistory] of Object.entries(txState)) {
      if (txHistory[txID] !== undefined) {
        return {
          ...state,
          transactions: {
            ...state.transactions,
            [network]: {
              ...state.transactions[network],
              [accountID]: {
                ...state.transactions[network][accountID],
                [txID]: {
                  ...state.transactions[network][accountID][txID],
                  blocktimeMs: blocktime * 1000,
                  status: TxStatusEnum.Confirmed,
                },
              },
            },
          },
        };
      }
    }
    return state;
  };
}

function addUnconfirmed(state: UtxosTransactionsState) {
  return (
    unconfirmedUtxos: UnblindedOutput[],
    accountID: AccountID,
    network: NetworkString
  ): UtxosTransactionsState => {
    const addUnspentFunc = addUnspent(state);
    for (const utxo of unconfirmedUtxos) {
      state = addUnspentFunc(accountID, utxo, network);
    }
    return state;
  };
}

// returns only utxos locked for less than 5 minutes
const filterOnlyRecentLockedUtxos = (state: UtxosTransactionsState) => {
  const expiredTime = Date.now() - lockedUtxoMinimumTime; // 5 minutes
  const lockedUtxos: Record<string, number> = {};
  for (const key of Object.keys(state.lockedUtxos)) {
    const isRecent = state.lockedUtxos[key] > expiredTime;
    if (isRecent) lockedUtxos[key] = state.lockedUtxos[key];
  }
  return lockedUtxos;
};
