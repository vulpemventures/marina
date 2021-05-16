import { PasswordHash } from './../../../domain/wallet/value-objects/password-hash';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import {
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  VERIFICATION_SUCCESS,
  VERIFICATION_FAILURE,
  ONBOARDING_COMPLETETED,
  ONBOARDING_FAILURE,
  LOGOUT_SUCCESS,
  LOGOUT_FAILURE,
  CHANGE_NETWORK_SUCCESS,
  CHANGE_NETWORK_FAILURE,
} from './action-types';
import { IAppState } from '../../../domain/common';
import { hash } from '../../utils/crypto';
import { Password } from '../../../domain/wallet/value-objects';
import { NetworkValue } from '../../../domain/app/value-objects';
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

export function logOut(
  onSuccess: () => void,
  onError: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch) => {
    try {
      dispatch({ type: LOGOUT_SUCCESS });
      onSuccess();
    } catch (error) {
      dispatch({ type: LOGOUT_FAILURE, payload: { error } });
      onError(error);
    }
  };
}

export function changeNetwork(
  network: Network,
  onSuccess: () => void,
  onError: (err: Error) => void
): ThunkAction<void, IAppState, void, AnyAction> {
  return async (dispatch) => {
    try {
      dispatch({ type: CHANGE_NETWORK_SUCCESS, payload: { network } });
      onSuccess();
    } catch (error) {
      dispatch({ type: CHANGE_NETWORK_FAILURE, payload: { error } });
      onError(error);
    }
  };
}
