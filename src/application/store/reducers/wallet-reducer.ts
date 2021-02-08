import * as ACTION_TYPES from '../actions/action-types';
import { IWallet } from '../../../domain/wallet/wallet';
import { IError } from '../../../domain/common';

export const walletReducer = (state: IWallet[], [type, payload]: [string, any]): IWallet[] => {
  switch (type) {
    case ACTION_TYPES.INIT_WALLET: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: undefined,
        masterXPub: payload.masterXPub,
        masterBlindingKey: payload.masterBlindingKey,
        encryptedMnemonic: payload.encryptedMnemonic,
        passwordHash: payload.passwordHash,
        confidentialAddresses: payload.confidentialAddresses,
        utxoMap: payload.utxoMap,
      };
      return Object.assign([], state, [firstWallet]);
    }

    //
    case ACTION_TYPES.WALLET_CREATE_SUCCESS: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: undefined,
        masterXPub: payload.masterXPub,
        masterBlindingKey: payload.masterBlindingKey,
        encryptedMnemonic: payload.encryptedMnemonic,
        passwordHash: payload.passwordHash,
        confidentialAddresses: payload.confidentialAddresses,
        utxoMap: payload.utxoMap,
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_CREATE_FAILURE: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: { create: { message: payload.error.message } as IError },
      };
      return Object.assign([], state, [firstWallet]);
    }

    //
    case ACTION_TYPES.WALLET_RESTORE_SUCCESS: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: undefined,
        restored: true,
        masterXPub: payload.masterXPub,
        masterBlindingKey: payload.masterBlindingKey,
        encryptedMnemonic: payload.encryptedMnemonic,
        passwordHash: payload.passwordHash,
        confidentialAddresses: payload.confidentialAddresses,
        utxoMap: payload.utxoMap,
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_RESTORE_FAILURE: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: { restore: { message: payload.error.message } as IError },
      };
      return Object.assign([], state, [firstWallet]);
    }

    //
    case ACTION_TYPES.WALLET_DERIVE_ADDRESS_SUCCESS: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: undefined,
        confidentialAddresses: state[0].confidentialAddresses.concat([payload.address]),
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_DERIVE_ADDRESS_FAILURE: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: { address: { message: payload.error.message } as IError },
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_SET_PENDING_TX_SUCCESS: {
      const firstWallet: IWallet = {
        ...state[0],
        pendingTx: payload.pendingTx,
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_SET_PENDING_TX_FAILURE: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: { setPendingTx: { message: payload.error.message } as IError },
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_UNSET_PENDING_TX_SUCCESS: {
      const firstWallet: IWallet = {
        ...state[0],
        pendingTx: undefined,
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_UNSET_PENDING_TX_FAILURE: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: { unsetPendingTx: { message: payload.error.message } as IError },
      };
      return Object.assign([], state, [firstWallet]);
    }

    //
    case ACTION_TYPES.WALLET_SET_UTXOS_SUCCESS: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: undefined,
        utxoMap: payload.utxoMap,
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_SET_UTXOS_FAILURE: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: { utxos: { message: payload.error.message } as IError },
      };
      return Object.assign([], state, [firstWallet]);
    }

    //
    default: {
      return state;
    }
  }
};
