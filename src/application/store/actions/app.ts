import { ThunkAction } from 'redux-thunk';
import { RootState } from './../store';
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
import { Network } from '../../../domain/app/value-objects';
import { setIdleAction } from '../../utils/idle';
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
  onSuccess: () => void,
  onError: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    try {
      const { wallets } = getState();
      if (wallets.length <= 0) {
        throw ('Wallet does not exist');
      }
      const wallet = wallets[0];
      const h = hash(Password.create(password));
      if (wallet.passwordHash.value !== h.value) {
        throw new Error('Invalid password');
      }

      dispatch({ type: AUTHENTICATION_SUCCESS });
      setIdleAction(() => {
        dispatch({ type: LOGOUT_SUCCESS });
      });
      onSuccess();
    } catch (error) {
      dispatch({ type: AUTHENTICATION_FAILURE, payload: { error } });
      onError(error);
    }
  };
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
