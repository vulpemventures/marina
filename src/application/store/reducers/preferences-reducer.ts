/* eslint-disable @typescript-eslint/no-unsafe-return */

import { IPreferences } from '../../../domain/preferences/preferences';
import * as ACTION_TYPES from '../actions/action-types';

export const preferencesReducer = (state: IPreferences, [type, payload]: [string, unknown]) => {
  switch (type) {
    case ACTION_TYPES.ONBOARDING_COMPLETETED:
      console.log('isOnboardingCompleted to true');
      return {
        ...state,
        isOnboardingCompleted: true,
      };
    default:
      return state;
  }
};
