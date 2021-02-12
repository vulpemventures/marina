import {
  ONBOARDING_SET_PASSWORD,
  ONBOARDING_SET_MNEMONIC,
  ONBOARDING_SET_VERIFIED,
  ONBOARDING_SET_RESTORED,
  ONBOARDING_FLUSH,
} from './action-types';
import { Action, IAppState, Thunk } from '../../../domain/common';

export function setPassword(password: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([ONBOARDING_SET_PASSWORD, { password }]);
  };
}

export function setMnemonic(mnemonic: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([ONBOARDING_SET_MNEMONIC, { mnemonic }]);
  };
}

export function setVerified(): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([ONBOARDING_SET_VERIFIED]);
  };
}

export function setRestored(password: string, mnemonic: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([ONBOARDING_SET_PASSWORD, { password }]);
    dispatch([ONBOARDING_SET_MNEMONIC, { mnemonic }]);
    dispatch([ONBOARDING_SET_RESTORED]);
  };
}

export function flush(): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([ONBOARDING_FLUSH]);
  };
}
