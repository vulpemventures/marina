import * as ACTION_TYPES from '../actions/action-types';
import { IWallet } from '../../../domain/wallet';
import { IError } from '../../../domain/common';
import { AnyAction } from 'redux';

const initialStateWallet: IWallet = {
  confidentialAddresses: [],
  encryptedMnemonic: '',
  masterXPub: '',
  masterBlindingKey: '',
  passwordHash: '',
  utxoMap: {},
}

export function walletReducer(state: IWallet = initialStateWallet, { type, payload }: AnyAction): IWallet {
  switch (type) {
    case ACTION_TYPES.WALLET_CREATE_SUCCESS: {
      return {
        ...state,
        errors: undefined,
        masterXPub: payload.masterXPub,
        masterBlindingKey: payload.masterBlindingKey,
        encryptedMnemonic: payload.encryptedMnemonic,
        passwordHash: payload.passwordHash,
        confidentialAddresses: payload.confidentialAddresses,
        utxoMap: {},
        pendingTx: undefined,
      };
    }

    case ACTION_TYPES.WALLET_CREATE_FAILURE: {
      return {
        ...state,
        errors: { create: { message: payload.error.message } as IError },
      };
    }

    case ACTION_TYPES.WALLET_RESTORE_SUCCESS: {
      return {
        ...state,
        errors: undefined,
        restored: true,
        masterXPub: payload.masterXPub,
        masterBlindingKey: payload.masterBlindingKey,
        encryptedMnemonic: payload.encryptedMnemonic,
        passwordHash: payload.passwordHash,
        confidentialAddresses: payload.confidentialAddresses,
        utxoMap: {},
        pendingTx: undefined,
      };
    }

    case ACTION_TYPES.WALLET_RESTORE_FAILURE: {
      return {
        ...state,
        errors: { restore: { message: payload.error.message } as IError },
      };
    }

    case ACTION_TYPES.WALLET_DERIVE_ADDRESS_SUCCESS: {
      return {
        ...state,
        errors: undefined,
        confidentialAddresses: state.confidentialAddresses.concat([payload.address]),
      };
    }

    case ACTION_TYPES.WALLET_DERIVE_ADDRESS_FAILURE: {
      return {
        ...state,
        errors: { address: { message: payload.error.message } as IError },
      };
    }

    case ACTION_TYPES.WALLET_SET_ADDRESS_SUCCESS: {
      return {
        ...state,
        errors: undefined,
        confidentialAddresses: state.confidentialAddresses.concat([payload.address]),
      };
    }
    case ACTION_TYPES.WALLET_SET_ADDRESS_FAILURE: {
      return {
        ...state,
        errors: { address: { message: payload.error.message } as IError },
      };
    }

    case ACTION_TYPES.WALLET_SET_PENDING_TX_SUCCESS: {
      return {
        ...state,
        pendingTx: payload.pendingTx,
      };
    }

    case ACTION_TYPES.WALLET_SET_PENDING_TX_FAILURE: {
      return {
        ...state,
        errors: { setPendingTx: { message: payload.error.message } as IError },
      };
    }

    case ACTION_TYPES.WALLET_UNSET_PENDING_TX_SUCCESS: {
      return {
        ...state,
        pendingTx: undefined,
      };
    }

    case ACTION_TYPES.WALLET_UNSET_PENDING_TX_FAILURE: {
      return {
        ...state,
        errors: { unsetPendingTx: { message: payload.error.message } as IError },
      };
    }

    case ACTION_TYPES.WALLET_SET_UTXOS_SUCCESS: {
      return {
        ...state,
        errors: undefined,
        utxoMap: payload.utxoMap,
      };
    }

    case ACTION_TYPES.WALLET_SET_UTXOS_FAILURE: {
      return {
        ...state,
        errors: { utxos: { message: payload.error.message } as IError },
      };
    }

    default: {
      return state;
    }
  }
};