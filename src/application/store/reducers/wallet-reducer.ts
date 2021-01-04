import * as ACTION_TYPES from '../actions/action-types';
import { IWallet } from '../../../domain/wallet/wallet';
import { IError } from '../../../domain/common';

export const walletReducer = (state: IWallet[], [type, payload]: [string, any]): IWallet[] => {
  switch (type) {
    case ACTION_TYPES.WALLET_RESTORE_SUCCESS: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: undefined,
        mnemonic: payload.mnemonic,
      };
      return Object.assign([], state, [firstWallet]);
    }
    case ACTION_TYPES.WALLET_RESTORE_FAILURE: {
      const firstWallet: IWallet = {
        ...state[0],
        errors: { mnemonic: { message: payload.error.message } as IError },
      };
      return Object.assign([], state, [firstWallet]);
    }
    default: {
      return state;
    }
  }
};
