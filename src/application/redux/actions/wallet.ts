import { WALLET_SET_ADDRESS_SUCCESS, WALLET_SET_DATA } from './action-types';
import { AnyAction } from 'redux';
import { WalletData } from '../../utils/wallet';
import { Address } from '../../../domain/address';
import { ActionWithPayload } from '../../../domain/common';

export function setWalletData(walletData: WalletData): AnyAction {
  return {
    type: WALLET_SET_DATA,
    payload: walletData,
  };
}

export function setAddress(
  address: Address
): ActionWithPayload<{ address?: Address; error?: any }> {
  return {
    type: WALLET_SET_ADDRESS_SUCCESS,
    payload: { address },
  };
}
