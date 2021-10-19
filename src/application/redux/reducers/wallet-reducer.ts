/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { toStringOutpoint } from './../../utils/utxos';
import * as ACTION_TYPES from '../actions/action-types';
import { WalletState } from '../../../domain/wallet';
import { AnyAction } from 'redux';
import { UtxoInterface } from 'ldk';
import { AccountID, MainAccountID } from '../../../domain/account';

export const walletInitState: WalletState = {
  mainAccount: {
    accountID: MainAccountID,
    encryptedMnemonic: '',
    masterBlindingKey: '',
    masterXPub: '',
    restorerOpts: {
      lastUsedExternalIndex: 0,
      lastUsedInternalIndex: 0,
    },
  },
  restrictedAssetAccounts: {},
  unspentsAndTransactions: {
    MainAccountID: {
      utxosMap: { },
      transactions: { regtest: { }, liquid: { } }
    }
  },
  passwordHash: '',
  deepRestorer: {
    gapLimit: 20,
    isLoading: false,
  },
  isVerified: false,
};

const addUnspent = (state: WalletState) => (accountID: AccountID, utxo: UtxoInterface): WalletState => {
  return {
    ...state,
    unspentsAndTransactions: {
      ...state.unspentsAndTransactions,
      [accountID]: {
        ...state.unspentsAndTransactions[accountID],
        utxosMap: {
          ...state.unspentsAndTransactions[accountID].utxosMap,
          [toStringOutpoint(utxo)]: utxo,
        }
      }
    }
  }
}

export function walletReducer(
  state: WalletState = walletInitState,
  { type, payload }: AnyAction
): WalletState {
  switch (type) {
    case ACTION_TYPES.RESET_WALLET: {
      return walletInitState;
    }

    case ACTION_TYPES.WALLET_SET_DATA: {
      return {
        ...state,
        passwordHash: payload.passwordHash,
        mainAccount: { ...payload },
      };
    }

    case ACTION_TYPES.NEW_CHANGE_ADDRESS_SUCCESS: {
      return {
        ...state,
        mainAccount: {
          ...state.mainAccount,
          restorerOpts: {
            ...state.mainAccount.restorerOpts,
            lastUsedInternalIndex: (state.mainAccount.restorerOpts.lastUsedInternalIndex ?? -1) + 1,
          },
        },
      };
    }

    case ACTION_TYPES.NEW_ADDRESS_SUCCESS: {
      return {
        ...state,
        mainAccount: {
          ...state.mainAccount,
          restorerOpts: {
            ...state.mainAccount.restorerOpts,
            lastUsedExternalIndex: (state.mainAccount.restorerOpts.lastUsedExternalIndex ?? -1) + 1,
          },
        },
      };
    }

    case ACTION_TYPES.ADD_UTXO: {
      return addUnspent(state)(payload.accountID, payload.utxo);
    }

    case ACTION_TYPES.DELETE_UTXO: {
      const {
        [toStringOutpoint({ txid: payload.txid, vout: payload.vout })]: deleted,
        ...utxosMap
      } = state.unspentsAndTransactions[payload.accountID].utxosMap;

      return {
        ...state,
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [payload.accountID]: {
            ...state.unspentsAndTransactions[payload.accountID],
            utxosMap,
          }
        }
      };
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
      return {
        ...state,
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [payload.accountID]: {
            ...state.unspentsAndTransactions[payload.accountID],
            utxosMap: {},
          }
        }
      }
    }

    case ACTION_TYPES.SET_VERIFIED: {
      return {
        ...state,
        isVerified: true,
      };
    }

    default: {
      return state;
    }
  }
}
