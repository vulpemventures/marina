import {
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  ONBOARDING_COMPLETETED,
  LOGOUT_SUCCESS,
  CHANGE_NETWORK_SUCCESS,
  START_PERIODIC_UPDATE,
  SET_EXPLORER,
  RESET,
  STOP_PERIODIC_UPDATE,
} from './action-types';
import { AnyAction } from 'redux';
import { Password } from '../../../domain/password';
import { match, PasswordHash } from '../../../domain/password-hash';
import { ExplorerURLs } from '../../../domain/app';
import { NetworkString } from 'ldk';
import { INVALID_PASSWORD_ERROR } from '../../utils';

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

export function startPeriodicUpdate(): AnyAction {
  return { type: START_PERIODIC_UPDATE };
}

export function stopPeriodicUpdate(): AnyAction {
  return { type: STOP_PERIODIC_UPDATE };
}

export function reset(): AnyAction {
  return { type: RESET };
}
