import {
  SET_DEEP_RESTORER_IS_LOADING,
  WALLET_SET_DATA,
  SET_DEEP_RESTORER_GAP_LIMIT,
  SET_DEEP_RESTORER_ERROR,
  START_DEEP_RESTORATION,
  INCREMENT_EXTERNAL_ADDRESS_INDEX,
  INCREMENT_INTERNAL_ADDRESS_INDEX,
  SET_VERIFIED,
  SET_RESTORER_OPTS,
  POP_UPDATER_LOADER,
  PUSH_UPDATER_LOADER
} from './action-types';
import { AnyAction } from 'redux';
import { WalletData } from '../../utils/wallet';
import { AccountID } from '../../../domain/account';
import { StateRestorerOpts } from 'ldk';

export function setWalletData(walletData: WalletData): AnyAction {
  return {
    type: WALLET_SET_DATA,
    payload: walletData,
  };
}

export function setRestorerOpts(accountID: AccountID, restorerOpts: StateRestorerOpts): AnyAction {
  return {
    type: SET_RESTORER_OPTS,
    payload: { accountID, restorerOpts },
  };
}

export function incrementAddressIndex(accountID: AccountID): AnyAction {
  return { type: INCREMENT_EXTERNAL_ADDRESS_INDEX, payload: { accountID } };
}

export function incrementChangeAddressIndex(accountID: AccountID): AnyAction {
  return { type: INCREMENT_INTERNAL_ADDRESS_INDEX, payload: { accountID } };
}

export function setDeepRestorerIsLoading(isLoading: boolean): AnyAction {
  return {
    type: SET_DEEP_RESTORER_IS_LOADING,
    payload: { isLoading },
  };
}

export function setDeepRestorerGapLimit(gapLimit: number): AnyAction {
  return {
    type: SET_DEEP_RESTORER_GAP_LIMIT,
    payload: { gapLimit },
  };
}

export function setDeepRestorerError(error: Error | undefined): AnyAction {
  return {
    type: SET_DEEP_RESTORER_ERROR,
    payload: { error: error ? error.message : undefined },
  };
}

export function startDeepRestorer(): AnyAction {
  return {
    type: START_DEEP_RESTORATION,
  };
}

export function setVerified(): AnyAction {
  return { type: SET_VERIFIED };
}

export const popUpdaterLoader = (): AnyAction => ({
  type: POP_UPDATER_LOADER,
})

export const pushUpdaterLoader = (): AnyAction => ({
  type: PUSH_UPDATER_LOADER,
})

