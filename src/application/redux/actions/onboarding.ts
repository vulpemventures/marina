import {
  ONBOARDING_SET_PASSWORD,
  ONBOARDING_SET_MNEMONIC,
  ONBOARDING_SET_VERIFIED,
  ONBOARDING_SET_RESTORED,
  ONBOARDING_FLUSH,
} from './action-types';
import { AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';

export function setPassword(password: string): AnyAction {
  return { type: ONBOARDING_SET_PASSWORD, payload: { password } }
}

export function setMnemonic(mnemonic: string): AnyAction {
  return { type: ONBOARDING_SET_MNEMONIC, payload: { mnemonic } };
}

export function setVerified(): AnyAction {
  return { type: ONBOARDING_SET_VERIFIED }
};

export function setRestored(password: string, mnemonic: string): ThunkAction<void, RootState, void, AnyAction> {
  return (dispatch) => {
    dispatch({ type: ONBOARDING_SET_PASSWORD, payload: { password } });
    dispatch({ type: ONBOARDING_SET_MNEMONIC, payload: { mnemonic } });
    dispatch({ type: ONBOARDING_SET_RESTORED });
  };
}

export function flushOnboarding(): AnyAction {
  return { type: ONBOARDING_FLUSH }
}
