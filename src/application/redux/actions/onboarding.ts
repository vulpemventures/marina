import {
  ONBOARDING_SET_VERIFIED,
  ONBOARDING_FLUSH,
  ONBOARDING_SET_MNEMONIC_AND_PASSWORD,
} from './action-types';
import { AnyAction } from 'redux';

export function setVerified(): AnyAction {
  return { type: ONBOARDING_SET_VERIFIED }
};

export function setPasswordAndOnboardingMnemonic(password: string, mnemonic: string): AnyAction {
  return {
    type: ONBOARDING_SET_MNEMONIC_AND_PASSWORD,
    payload: { mnemonic, password },
  };
}

export function flushOnboarding(): AnyAction {
  return { type: ONBOARDING_FLUSH }
}
