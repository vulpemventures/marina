import {
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  VERIFICATION_SUCCESS,
  VERIFICATION_FAILURE,
  ONBOARDING_COMPLETETED,
  ONBOARDING_FAILURE,
} from './action-types';
import { IAppState, Thunk } from '../../../domain/common';
import { IPreferencesRepository } from '../../../domain/preferences/i-preferences-repository';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { IPreferences } from '../../../domain/preferences/preferences';
import { hash } from '../../utils/crypto';

export function verifyWallet(
  repo: IPreferencesRepository,
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState) => {
    try {
      await repo.updatePreferences(
        (pref: IPreferences): IPreferences => {
          pref.isWalletVerified = true;
          return pref;
        }
      );

      dispatch([VERIFICATION_SUCCESS, { isWalletVerified: true }]);
      onSuccess();
    } catch (error) {
      dispatch([VERIFICATION_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function onboardingComplete(
  repo: IPreferencesRepository,
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState) => {
    try {
      await repo.updatePreferences(
        (pref: IPreferences): IPreferences => {
          pref.isOnboardingCompleted = true;
          return pref;
        }
      );

      dispatch([ONBOARDING_COMPLETETED, { isWalletVerified: true }]);
      onSuccess();
    } catch (error) {
      dispatch([ONBOARDING_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function logIn(
  password: string,
  walletRepo: IWalletRepository,
  prefRepo: IPreferencesRepository,
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState) => {
    try {
      const wallet = await walletRepo.getOrCreateWallet();
      if (wallet.passwordHash !== hash(password)) {
        throw new Error('Invalid password');
      }

      await prefRepo.updatePreferences(
        (pref: IPreferences): IPreferences => {
          pref.isAuthenticated = true;
          return pref;
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