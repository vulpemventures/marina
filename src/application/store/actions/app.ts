import {
  INIT_APP,
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
import { Action, IAppState, Thunk } from '../../../domain/common';
import { App, IApp } from '../../../domain/app/app';
import { hash } from '../../utils/crypto';
import { Password } from '../../../domain/wallet/value-objects';
import { Network } from '../../../domain/app/value-objects';
import { setIdleAction } from '../../utils/idle';
import { browser } from 'webextension-polyfill-ts';

export function initApp(app: IApp): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([INIT_APP, { ...app }]);
  };
}

export function verifyWallet(
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
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
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    try {
      // this allows users to open the popup shell clicking on the toolbar
      await browser.browserAction.setPopup({ popup: 'popup.html' });

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
): Thunk<IAppState, Action> {
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

      setIdleAction(() => {
        repos.app
          .updateApp(
            (app: App): App => {
              app.props.isAuthenticated = false;
              return app;
            }
          )
          .then(() => dispatch([LOGOUT_SUCCESS]))
          .catch(console.error);
      });

      onSuccess();
    } catch (error) {
      dispatch([AUTHENTICATION_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function logOut(
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, _, repos) => {
    try {
      await repos.app.updateApp(
        (app: App): App => {
          app.props.isAuthenticated = false;
          return app;
        }
      );

      dispatch([LOGOUT_SUCCESS]);
      onSuccess();
    } catch (error) {
      dispatch([LOGOUT_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function changeNetwork(
  network: Network,
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, _, repos) => {
    try {
      await repos.app.updateApp(
        (app: App): App => {
          app.props.network = network;
          return app;
        }
      );

      dispatch([CHANGE_NETWORK_SUCCESS, { network }]);
      onSuccess();
    } catch (error) {
      dispatch([CHANGE_NETWORK_FAILURE, { error }]);
      onError(error);
    }
  };
}
