import {
  VERIFICATION_SUCCESS,
  VERIFICATION_FAILURE,
  ONBOARDING_COMPLETETED,
  ONBOARDING_FAILURE,
} from './action-types';
import { IAppState, Thunk } from '../../../domain/common';
import { IPreferencesRepository } from '../../../domain/preferences/i-preferences-repository';
import { IPreferences } from '../../../domain/preferences/preferences';

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
