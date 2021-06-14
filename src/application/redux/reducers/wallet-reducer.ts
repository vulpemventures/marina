import { toStringOutpoint } from './../../utils/utxos';
import * as ACTION_TYPES from '../actions/action-types';
import { IWallet } from '../../../domain/wallet';
import { AnyAction } from 'redux';
import { UtxoInterface } from 'ldk';

const initialStateWallet: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: '',
  masterXPub: '',
  masterBlindingKey: '',
  passwordHash: '',
  utxoMap: {},
  deepRestorer: {
    gapLimit: 30,
    isLoading: false,
  },
};

export function walletReducer(
  state: IWallet = initialStateWallet,
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
        confidentialAddresses: payload.confidentialAddresses,
      };
    }

    case ACTION_TYPES.WALLET_SET_ADDRESS_SUCCESS: {
      return {
        ...state,
        errors: undefined,
        confidentialAddresses: state.confidentialAddresses.concat([payload.address]),
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
    default: {
      return state;
    }
  }
}
