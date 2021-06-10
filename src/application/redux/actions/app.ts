import {
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  VERIFICATION_SUCCESS,
  ONBOARDING_COMPLETETED,
  LOGOUT_SUCCESS,
  CHANGE_NETWORK_SUCCESS,
  START_PERIODIC_UPDATE,
} from './action-types';
import { ActionCreator, AnyAction } from 'redux';
import { Network } from '../../../domain/network';
import { Password } from '../../../domain/password';
import { match, PasswordHash } from '../../../domain/password-hash';

export const verifyWalletSuccess: ActionCreator<AnyAction> = () => ({
  type: VERIFICATION_SUCCESS,
});

export const onBoardingCompleted = (): AnyAction => ({
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
