/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as ACTION_TYPES from '../actions/action-types';
import { IWallet } from '../../../domain/wallet/wallet';
import { IdentityOpts, IdentityType, Mnemonic } from 'tdex-sdk';
import { IError } from '../../../domain/common/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const walletReducer = (state: IWallet[], [type, payload]: [string, any]): IWallet[] => {
  switch (type) {
    // case ACTION_TYPES.WALLET_CREATE_REQUEST: {
    //   return {
    //     ...state,
    //     mnemonic: ['ACTION_TYPE', 'WALLET_CREATED'],
    //   };
    // }
    case ACTION_TYPES.WALLET_RESTORE_REQUEST: {
      // Restore wallet from mnemonic
      try {
        const validOpts: IdentityOpts = {
          chain: 'regtest',
          type: IdentityType.Mnemonic,
          value: {
            mnemonic: payload.mnemonic,
          },
        };
        const mnemonic = new Mnemonic(validOpts);
        console.log('mnemonic: ', mnemonic);
        const firstWallet: IWallet = {
          ...state[0],
          errors: undefined,
          mnemonic: payload.mnemonic,
        };
        return Object.assign([], state, [firstWallet]);
      } catch (err) {
        console.log('state: ', err);
        console.log('err reducer: ', err);
        console.log('err reducer: ', err.message);
        const firstWallet: IWallet = {
          ...state[0],
          errors: { mnemonic: { message: err.message } as IError },
        };
        return Object.assign([], state, [firstWallet]);
      }
    }
    default: {
      return state;
    }
  }
};
