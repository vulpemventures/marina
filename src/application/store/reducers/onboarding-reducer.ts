import { AnyAction } from 'redux';
import * as ACTION_TYPES from '../actions/action-types';

export interface OnboardingState {
  mnemonic: string;
  password: string;
  verified: boolean;
  restored: boolean;
}

const onboardingInitState: OnboardingState = {
  mnemonic: '',
  password: '',
  verified: false,
  restored: false,
};

export function onboardingReducer(state: OnboardingState = onboardingInitState, { type, payload }: AnyAction): OnboardingState {
  switch (type) {
    case ACTION_TYPES.ONBOARDING_SET_PASSWORD: {
      return {
        ...state,
        verified: false,
        password: payload.password,
      };
    }
    case ACTION_TYPES.ONBOARDING_SET_MNEMONIC: {
      return {
        ...state,
        verified: false,
        mnemonic: payload.mnemonic,
      };
    }
    case ACTION_TYPES.ONBOARDING_SET_VERIFIED: {
      return {
        ...state,
        verified: true,
      };
    }
    case ACTION_TYPES.ONBOARDING_SET_RESTORED: {
      return {
        ...state,
        restored: true,
      };
    }
    case ACTION_TYPES.ONBOARDING_FLUSH: {
      return onboardingInitState;
    }
    default:
      return state;
  }
};
