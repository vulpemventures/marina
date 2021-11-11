import { AnyAction } from 'redux';
import * as ACTION_TYPES from '../actions/action-types';

export interface OnboardingState {
  mnemonic: string;
  password: string;
  isFromPopupFlow: boolean;
  needSecurityAccount: boolean;
}

const onboardingInitState: OnboardingState = {
  mnemonic: '',
  password: '',
  isFromPopupFlow: false,
  needSecurityAccount: false,
};

export function onboardingReducer(
  state: OnboardingState = onboardingInitState,
  { type, payload }: AnyAction
): OnboardingState {
  switch (type) {
    case ACTION_TYPES.ONBOARDING_SET_MNEMONIC_AND_PASSWORD: {
      return {
        ...state,
        password: payload.password,
        mnemonic: payload.mnemonic,
        needSecurityAccount: payload.needSecurityAccount,
      };
    }

    case ACTION_TYPES.ONBOARDING_FLUSH: {
      return onboardingInitState;
    }

    case ACTION_TYPES.ONBOARDING_SET_IS_FROM_POPUP_FLOW: {
      return {
        ...state,
        mnemonic: payload.mnemonic,
        isFromPopupFlow: true,
      };
    }
    default:
      return state;
  }
}
