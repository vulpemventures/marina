/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { toStringOutpoint } from './../../utils/utxos';
import * as ACTION_TYPES from '../actions/action-types';
import { IWallet } from '../../../domain/wallet';
import { AnyAction } from 'redux';
import { UtxoInterface } from 'ldk';

export const walletInitState: IWallet = {
  restorerOpts: {
    lastUsedExternalIndex: 0,
    lastUsedInternalIndex: 0,
  },
  encryptedMnemonic: '',
  masterXPub: '',
  masterBlindingKey: '',
  passwordHash: '',
  utxoMap: {},
  deepRestorer: {
    gapLimit: 20,
    isLoading: false,
  },
  isVerified: false,
};

export function walletReducer(
  state: IWallet = walletInitState,
  { type, payload }: AnyAction
): IWallet {
  switch (type) {
    case ACTION_TYPES.WALLET_SET_DATA: {
      return {
        ...state,
        masterXPub: payload.masterXPub,
        masterBlindingKey: payload.masterBlindingKey,
        encryptedMnemonic: payload.encryptedMnemonic,
        passwordHash: payload.passwordHash,
        restorerOpts: payload.restorerOpts,
      };
    }

    case ACTION_TYPES.NEW_CHANGE_ADDRESS_SUCCESS: {
      return {
        ...state,
        restorerOpts: {
          ...state.restorerOpts,
          lastUsedInternalIndex: (state.restorerOpts.lastUsedInternalIndex ?? -1) + 1,
        },
      };
    }

    case ACTION_TYPES.NEW_ADDRESS_SUCCESS: {
      return {
        ...state,
        restorerOpts: {
          ...state.restorerOpts,
          lastUsedExternalIndex: (state.restorerOpts.lastUsedExternalIndex ?? -1) + 1,
        },
      };
    }

    case ACTION_TYPES.ADD_UTXO: {
      return {
        ...state,
        utxoMap: {
          ...state.utxoMap,
          [toStringOutpoint(payload.utxo as UtxoInterface)]: payload.utxo,
        },
      };
    }

    case ACTION_TYPES.DELETE_UTXO: {
      const {
        [toStringOutpoint({ txid: payload.txid, vout: payload.vout })]: deleted,
        ...utxoMap
      } = state.utxoMap;
      return {
        ...state,
        utxoMap,
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
        utxoMap: {},
      };
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
