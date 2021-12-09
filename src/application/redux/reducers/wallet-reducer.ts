/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { toStringOutpoint } from './../../utils/utxos';
import * as ACTION_TYPES from '../actions/action-types';
import { WalletState } from '../../../domain/wallet';
import { AnyAction } from 'redux';
import { AccountID, MainAccountID } from '../../../domain/account';
import { TxDisplayInterface } from '../../../domain/transaction';
import { NetworkString, UnblindedOutput } from 'ldk';

export const walletInitState: WalletState = {
  [MainAccountID]: {
    encryptedMnemonic: '',
    masterBlindingKey: '',
    masterXPub: '',
    restorerOpts: {
      lastUsedExternalIndex: 0,
      lastUsedInternalIndex: 0,
    },
  },
  unspentsAndTransactions: {
    [MainAccountID]: {
      utxosMap: {},
      transactions: { regtest: {}, liquid: {}, testnet: {} },
    },
  },
  passwordHash: '',
  deepRestorer: {
    gapLimit: 20,
    isLoading: false,
  },
  updaterLoaders: 0,
  isVerified: false,
};

const addUnspent =
  (state: WalletState) =>
  (accountID: AccountID, utxo: UnblindedOutput): WalletState => {
    return {
      ...state,
      unspentsAndTransactions: {
        ...state.unspentsAndTransactions,
        [accountID]: {
          ...state.unspentsAndTransactions[accountID],
          utxosMap: {
            ...state.unspentsAndTransactions[accountID].utxosMap,
            [toStringOutpoint(utxo)]: utxo,
          },
        },
      },
    };
  };

const addTx =
  (state: WalletState) =>
  (accountID: AccountID, tx: TxDisplayInterface, network: NetworkString): WalletState => {
    return {
      ...state,
      unspentsAndTransactions: {
        ...state.unspentsAndTransactions,
        [accountID]: {
          ...state.unspentsAndTransactions[accountID],
          transactions: {
            ...state.unspentsAndTransactions[accountID].transactions,
            [network]: {
              ...state.unspentsAndTransactions[accountID].transactions[network],
              [tx.txId]: tx,
            },
          },
        },
      },
    };
  };

export function walletReducer(
  state: WalletState = walletInitState,
  { type, payload }: AnyAction
): WalletState {
  switch (type) {
    case ACTION_TYPES.RESET_WALLET: {
      return walletInitState;
    }

    case ACTION_TYPES.SET_RESTORER_OPTS: {
      return {
        ...state,
        [payload.accountID]: {
          ...state[payload.accountID as AccountID],
          restorerOpts: payload.restorerOpts,
        },
      };
    }

    case ACTION_TYPES.WALLET_SET_DATA: {
      return {
        ...state,
        passwordHash: payload.passwordHash,
        mainAccount: { accountID: MainAccountID, ...payload },
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [MainAccountID]: {
            utxosMap: {},
            transactions: { regtest: {}, liquid: {}, testnet: {} },
          },
        },
      };
    }

    case ACTION_TYPES.INCREMENT_INTERNAL_ADDRESS_INDEX: {
      const accountID = payload.accountID as AccountID;
      return {
        ...state,
        [accountID]: {
          ...state[accountID],
          restorerOpts: {
            ...state[accountID]?.restorerOpts,
            lastUsedInternalIndex: (state[accountID]?.restorerOpts.lastUsedInternalIndex ?? 0) + 1,
          },
        },
      };
    }

    case ACTION_TYPES.INCREMENT_EXTERNAL_ADDRESS_INDEX: {
      const accountID = payload.accountID as AccountID;
      return {
        ...state,
        [accountID]: {
          ...state[accountID],
          restorerOpts: {
            ...state[accountID]?.restorerOpts,
            lastUsedExternalIndex: (state[accountID]?.restorerOpts.lastUsedExternalIndex ?? 0) + 1,
          },
        },
      };
    }

    case ACTION_TYPES.ADD_UTXO: {
      return addUnspent(state)(payload.accountID, payload.utxo);
    }

    case ACTION_TYPES.DELETE_UTXO: {
      const accountID = payload.accountID as AccountID;
      if (!state.unspentsAndTransactions[accountID]) {
        return state;
      }

      const {
        [toStringOutpoint({ txid: payload.txid, vout: payload.vout })]: deleted,
        ...utxosMap
      } = state.unspentsAndTransactions[accountID].utxosMap;

      return {
        ...state,
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [payload.accountID]: {
            ...state.unspentsAndTransactions[accountID],
            utxosMap,
          },
        },
      };
    }

    case ACTION_TYPES.ADD_TX: {
      return addTx(state)(payload.accountID, payload.tx, payload.network);
    }

    case ACTION_TYPES.SET_DEEP_RESTORER_GAP_LIMIT: {
      return {
        ...state,
        deepRestorer: { ...state.deepRestorer, gapLimit: payload.gapLimit },
      };
    }

    case ACTION_TYPES.SET_DEEP_RESTORER_IS_LOADING: {
      return {
        ...state,
        deepRestorer: { ...state.deepRestorer, isLoading: payload.isLoading },
      };
    }

    case ACTION_TYPES.SET_DEEP_RESTORER_ERROR: {
      return {
        ...state,
        deepRestorer: { ...state.deepRestorer, error: payload.error },
      };
    }

    case ACTION_TYPES.FLUSH_UTXOS: {
      const accountID = payload.accountID as AccountID;
      return {
        ...state,
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [accountID]: {
            ...state.unspentsAndTransactions[accountID],
            utxosMap: {},
          },
        },
      };
    }

    case ACTION_TYPES.SET_VERIFIED: {
      return {
        ...state,
        isVerified: true,
      };
    }

    case ACTION_TYPES.PUSH_UPDATER_LOADER: {
      return {
        ...state,
        updaterLoaders: neverNegative(state.updaterLoaders + 1),
      };
    }

    case ACTION_TYPES.POP_UPDATER_LOADER: {
      return {
        ...state,
        updaterLoaders: neverNegative(state.updaterLoaders - 1),
      };
    }

    default: {
      return state;
    }
  }
}

const neverNegative = (n: number) => {
  if (n < 0) return 0;
  return n;
};
