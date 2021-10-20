import {
  SET_DEEP_RESTORER_IS_LOADING,
  WALLET_SET_DATA,
  SET_DEEP_RESTORER_GAP_LIMIT,
  SET_DEEP_RESTORER_ERROR,
  START_DEEP_RESTORATION,
  NEW_ADDRESS_SUCCESS,
  NEW_CHANGE_ADDRESS_SUCCESS,
  SET_VERIFIED,
  WALLET_ADD_RESTRICTED_ASSET_ACCOUNT,
} from './action-types';
import { AnyAction } from 'redux';
import { WalletData } from '../../utils/wallet';
import { extractErrorMessage } from '../../../presentation/utils/error';
import { MultisigAccountData } from '../../../domain/account';
import { CosignerExtraData } from '../../../domain/wallet';

export function addRestrictedAssetData(
  multisigAccountData: MultisigAccountData<CosignerExtraData>
) {
  return {
    type: WALLET_ADD_RESTRICTED_ASSET_ACCOUNT,
    payload: { multisigAccountData },
  };
}

export function setWalletData(walletData: WalletData): AnyAction {
  return {
    type: WALLET_SET_DATA,
    payload: walletData,
  };
}

export function incrementAddressIndex(): AnyAction {
  return { type: NEW_ADDRESS_SUCCESS };
}

export function incrementChangeAddressIndex(): AnyAction {
  return { type: NEW_CHANGE_ADDRESS_SUCCESS };
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
    payload: { error: extractErrorMessage(error) },
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
