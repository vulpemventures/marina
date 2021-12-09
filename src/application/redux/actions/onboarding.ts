import {
  ONBOARDING_FLUSH,
  ONBOARDING_SET_MNEMONIC_AND_PASSWORD,
  ONBOARDING_SET_IS_FROM_POPUP_FLOW,
  ONBOARDING_SET_VERIFIED,
} from './action-types';
import { AnyAction } from 'redux';

export function setPasswordAndOnboardingMnemonic(
  password: string,
  mnemonic: string,
  needSecurityAccount: boolean
): AnyAction {
  return {
    type: ONBOARDING_SET_MNEMONIC_AND_PASSWORD,
    payload: { mnemonic, password, needSecurityAccount },
  };
}

export function flushOnboarding(): AnyAction {
  return { type: ONBOARDING_FLUSH };
}

export function setBackup(mnemonic: string): AnyAction {
  return {
    type: ONBOARDING_SET_IS_FROM_POPUP_FLOW,
    payload: { mnemonic },
  };
}

export function setOnboardingVerified(): AnyAction {
  return {
    type: ONBOARDING_SET_VERIFIED,
  };
}
