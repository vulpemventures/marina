import {
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  ONBOARDING_COMPLETETED,
  LOGOUT_SUCCESS,
  CHANGE_NETWORK_SUCCESS,
  SET_EXPLORER,
  RESET,
  SET_CHANGE_ACCOUNT,
} from './action-types';
import type { AnyAction } from 'redux';
import type { Password } from '../../../domain/password';
import type { PasswordHash } from '../../../domain/password-hash';
import { match } from '../../../domain/password-hash';
import type { ExplorerURLs } from '../../../domain/app';
import type { NetworkString } from 'ldk';
import { INVALID_PASSWORD_ERROR } from '../../utils/constants';
import type { AccountID } from '../../../domain/account';

export const setExplorer = (explorer: ExplorerURLs, network: NetworkString): AnyAction => ({
  type: SET_EXPLORER,
  payload: { explorer, network },
});

export const onboardingCompleted = (): AnyAction => ({
  type: ONBOARDING_COMPLETETED,
});

export function logIn(password: Password, passwordHash: PasswordHash): AnyAction {
  try {
    if (!match(password, passwordHash)) {
      return {
        type: AUTHENTICATION_FAILURE,
        payload: { error: new Error(INVALID_PASSWORD_ERROR) },
      };
    }

    return { type: AUTHENTICATION_SUCCESS };
  } catch (error) {
    return { type: AUTHENTICATION_FAILURE, payload: { error } };
  }
}

export function logOut(): AnyAction {
  return { type: LOGOUT_SUCCESS };
}

export function changeNetwork(network: NetworkString): AnyAction {
  return { type: CHANGE_NETWORK_SUCCESS, payload: { network } };
}

export function reset(): AnyAction {
  return { type: RESET };
}

export function setChangeAccount(accountID: AccountID): AnyAction {
  return { type: SET_CHANGE_ACCOUNT, payload: { accountID } };
}
