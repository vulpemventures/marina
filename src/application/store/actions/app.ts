import {
  INIT_APP,
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  VERIFICATION_SUCCESS,
  VERIFICATION_FAILURE,
  ONBOARDING_COMPLETETED,
  ONBOARDING_FAILURE,
} from './action-types';
import { IAppState, Thunk } from '../../../domain/common';
import { App, IApp } from '../../../domain/app/app';
import { hash } from '../../utils/crypto';
import { Password } from '../../../domain/wallet/value-objects';

export function initApp(app: IApp): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return (dispatch, getState, repos) => {
    dispatch([INIT_APP, { ...app }]);
  };
}

export function verifyWallet(
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState, repos) => {
    try {
      await repos.app.updateApp(
        (app: App): App => {
          app.props.isWalletVerified = true;
          return app;
        }
      );

      dispatch([VERIFICATION_SUCCESS]);
      onSuccess();
    } catch (error) {
      dispatch([VERIFICATION_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function onboardingComplete(
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState, repos) => {
    try {
      await repos.app.updateApp(
        (app: App): App => {
          app.props.isOnboardingCompleted = true;
          return app;
        }
      );

      dispatch([ONBOARDING_COMPLETETED]);
      onSuccess();
    } catch (error) {
      dispatch([ONBOARDING_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function logIn(
  password: string,
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState, repos) => {
    try {
      const { wallets } = getState();
      if (wallets.length <= 0) {
        throw new Error('Wallet does not exist');
      }
      const wallet = wallets[0];

      const h = hash(Password.create(password));
      if (wallet.passwordHash.value !== h.value) {
        throw new Error('Invalid password');
      }

      await repos.app.updateApp(
        (app: App): App => {
          app.props.isAuthenticated = true;
          return app;
        }
      );

      dispatch([AUTHENTICATION_SUCCESS]);
      onSuccess();
    } catch (error) {
      dispatch([AUTHENTICATION_FAILURE, { error }]);
      onError(error);
    }
  };
}
