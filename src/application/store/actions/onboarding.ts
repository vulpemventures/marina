import {
  SET_PASSWORD,
  SET_MNEMONIC,
  SET_VERIFIED,
  SET_RESTORED,
  FLUSH,
} from './action-types';
import { Action, IAppState, Thunk } from '../../../domain/common';

export function setPassword(password: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([SET_PASSWORD, { password }]);
  };
}

export function setMnemonic(mnemonic: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([SET_MNEMONIC, { mnemonic }]);
  };
}

export function setVerified(): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([SET_VERIFIED]);
  };
}

export function setRestored(password: string, mnemonic: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([SET_PASSWORD, { password }]);
    dispatch([SET_MNEMONIC, { mnemonic }]);
    dispatch([SET_RESTORED]);
  };
}

export function flush(): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([FLUSH]);
  };
}