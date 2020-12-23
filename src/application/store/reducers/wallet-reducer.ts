/* eslint-disable @typescript-eslint/no-unsafe-return */

import * as ACTION_TYPES from '../actions/action-types';
import { IWallet } from '../../../domain/wallet/wallet';

export const walletReducer = (state: IWallet[], [type, payload]: [string, unknown]) => {
  switch (type) {
    case ACTION_TYPES.WALLET_CREATED:
      return {
        ...state,
        mnemonic: ['ACTION_TYPE', 'WALLET_CREATED'],
      };
    default:
      return state;
  }
};
