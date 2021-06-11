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
        utxoMap: {},
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

    default: {
      return state;
    }
  }
}
