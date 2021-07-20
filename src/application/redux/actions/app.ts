import {
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  VERIFICATION_SUCCESS,
  ONBOARDING_COMPLETETED,
  LOGOUT_SUCCESS,
  CHANGE_NETWORK_SUCCESS,
  START_PERIODIC_UPDATE,
  SET_EXPLORER,
} from './action-types';
import { AnyAction } from 'redux';
import { Network } from '../../../domain/network';
import { Password } from '../../../domain/password';
import { match, PasswordHash } from '../../../domain/password-hash';
import { ExplorerURLs } from '../../../domain/app';

export const setExplorer = (explorer: ExplorerURLs, network: Network): AnyAction => ({
  type: SET_EXPLORER,
  payload: { explorer, network },
});

export const verifyWalletSuccess = (): AnyAction => ({
  type: VERIFICATION_SUCCESS,
});

export const onboardingCompleted = (): AnyAction => ({
  type: ONBOARDING_COMPLETETED,
});

export function logIn(password: Password, passwordHash: PasswordHash): AnyAction {
  try {
    if (!match(password, passwordHash)) {
      return { type: AUTHENTICATION_FAILURE, payload: { error: new Error('Invalid password') } };
    }

    return { type: AUTHENTICATION_SUCCESS };
  } catch (error) {
    return { type: AUTHENTICATION_FAILURE, payload: { error } };
  }
}

export function logOut(): AnyAction {
  return { type: LOGOUT_SUCCESS };
}

export function changeNetwork(network: Network): AnyAction {
  return { type: CHANGE_NETWORK_SUCCESS, payload: { network } };
}

export function startPeriodicUpdate(): AnyAction {
  return { type: START_PERIODIC_UPDATE };
}
