import { IPreferences } from '../../../domain/preferences/preferences';
import * as ACTION_TYPES from '../actions/action-types';

export const preferencesReducer = (
  state: IPreferences,
  [type, payload]: [string, any]
): IPreferences => {
  switch (type) {
    case ACTION_TYPES.AUTHENTICATION_SUCCESS: {
      return {
        ...state,
        isAuthenticated: true,
      };
    }
    case ACTION_TYPES.ONBOARDING_COMPLETETED: {
      console.log('isOnboardingCompleted to true');
      return {
        ...state,
        isOnboardingCompleted: true,
      };
    }
    default:
      return state;
  }
};
