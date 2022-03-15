import {
  ONBOARDING_FLUSH,
  ONBOARDING_SET_MNEMONIC_AND_PASSWORD,
  ONBOARDING_SET_IS_FROM_POPUP_FLOW,
  ONBOARDING_SET_VERIFIED,
} from './action-types';
import type { AnyAction } from 'redux';

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

// Onboarding Verified is a temporary state for verification of the secret mnemonic
// It aims to flag the new wallet as verified if
// (1) the user has already backed up the mnemonic via onboarding/wallet-confirm
// (2) the user is restoring a wallet via onboarding/wallet-restore
// then `wallet.isVerified` is set to `onboarding.verified` during onboarding /end-of-flow confirm step
export function setOnboardingVerified(): AnyAction {
  return {
    type: ONBOARDING_SET_VERIFIED,
  };
}
