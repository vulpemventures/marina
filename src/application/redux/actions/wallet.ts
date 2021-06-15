import {
  SET_DEEP_RESTORER_IS_LOADING,
  WALLET_SET_DATA,
  SET_DEEP_RESTORER_GAP_LIMIT,
  SET_DEEP_RESTORER_ERROR,
  START_DEEP_RESTORATION,
  NEW_ADDRESS_SUCCESS,
  NEW_CHANGE_ADDRESS_SUCCESS,
  SET_ADDRESSES,
} from './action-types';
import { AnyAction } from 'redux';
import { WalletData } from '../../utils/wallet';
import { Address } from '../../../domain/address';

export function setWalletData(walletData: WalletData): AnyAction {
  return {
    type: WALLET_SET_DATA,
    payload: walletData,
  };
}

export function setAddresses(addresses: Address[]): AnyAction {
  return {
    type: SET_ADDRESSES,
    payload: { addresses }
  }
}

export function incrementAddressIndex(address: Address): AnyAction {
  return { type: NEW_ADDRESS_SUCCESS, payload: { address } };
}

export function incrementChangeAddressIndex(address: Address): AnyAction {
  return { type: NEW_CHANGE_ADDRESS_SUCCESS, payload: { address } };
}

export function setDeepRestorerIsLoading(isLoading: boolean): AnyAction {
  return {
    type: SET_DEEP_RESTORER_IS_LOADING,
    payload: { isLoading },
  };
}

export function setDeepRestorerGapLimit(gapLimit: 30 | 60 | 90): AnyAction {
  return {
    type: SET_DEEP_RESTORER_GAP_LIMIT,
    payload: { gapLimit },
  };
}

export function setDeepRestorerError(error: Error | undefined): AnyAction {
  return {
    type: SET_DEEP_RESTORER_ERROR,
    payload: { error: error?.message || '' },
  };
}

export function startDeepRestorer(): AnyAction {
  return {
    type: START_DEEP_RESTORATION,
  };
}
