import { PasswordHash } from './../../../domain/wallet/value-objects/password-hash';
import {
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  VERIFICATION_SUCCESS,
  VERIFICATION_FAILURE,
  ONBOARDING_COMPLETETED,
  ONBOARDING_FAILURE,
  LOGOUT_SUCCESS,
  CHANGE_NETWORK_SUCCESS,
} from './action-types';
import { hash } from '../../utils/crypto';
import { Password } from '../../../domain/wallet/value-objects';
import { Network } from '../../../domain/app/value-objects';
import { ActionCreator, AnyAction } from 'redux';

export const verifyWalletSuccess: ActionCreator<AnyAction> = () => ({
  type: VERIFICATION_SUCCESS,
})

export const verifyWalletFailure: ActionCreator<AnyAction> = (error: Error) => ({
  type: VERIFICATION_FAILURE,
  payload: { error }
})

export const onBoardingCompleted = (): AnyAction => ({
  type: ONBOARDING_COMPLETETED
})

export const onBoardingFailure = (error: Error): AnyAction => ({
  type: ONBOARDING_FAILURE,
  payload: { error }
})


export function logIn(
  password: string,
  passwordHash: PasswordHash,
): AnyAction {
  try {
    const h = hash(Password.create(password));
    if (passwordHash.props.value !== h.value) {
      return { type: AUTHENTICATION_FAILURE, payload: { error: new Error('Invalid password') } };
    }

    return { type: AUTHENTICATION_SUCCESS };
  } catch (error) {
    return { type: AUTHENTICATION_FAILURE, payload: { error } };
  }
}

export function logOut(): AnyAction {
  return { type: LOGOUT_SUCCESS }
}

export function changeNetwork(
  network: Network,
): AnyAction {
  return { type: CHANGE_NETWORK_SUCCESS, payload: { network } }
}
