import { address as addressLDK } from 'ldk';
import {
  WALLET_CREATE_SUCCESS,
  WALLET_RESTORE_SUCCESS,
  WALLET_SET_ADDRESS_SUCCESS,
} from './action-types';
import { AnyAction } from 'redux';
import { WalletData } from '../../utils/wallet';
import { Address } from '../../../domain/address';
import { ActionWithPayload } from '../../../domain/common';

export function createWallet(walletData: WalletData): AnyAction {
  return {
    type: WALLET_CREATE_SUCCESS,
    payload: walletData,
  };
}

export function restoreWallet(walletData: WalletData): AnyAction {
  return {
    type: WALLET_RESTORE_SUCCESS,
    payload: walletData,
  };
}

export function setAddress(
  address: Address
): ActionWithPayload<{ address?: Address; error?: any }> {
  console.log(address, addressLDK.toOutputScript(address.value));
  return {
    type: WALLET_SET_ADDRESS_SUCCESS,
    payload: { address },
  };
}
