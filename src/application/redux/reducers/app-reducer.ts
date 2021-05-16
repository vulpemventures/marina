import { Network } from '../../../domain/app/value-objects/network';
import { IApp } from '../../../domain/app/app';
import { IError } from '../../../domain/common';
import { AnyAction } from 'redux';
import * as ACTION_TYPES from '../actions/action-types';

const appInitState: IApp = {
  isOnboardingCompleted: false,
  isAuthenticated: false,
  isWalletVerified: false,
  network: Network.create((process.env.NETWORK || 'liquid')),
}

export function appReducer(state: IApp = appInitState, { type, payload }: AnyAction): IApp {
  switch (type) {
    case ACTION_TYPES.INIT_APP: {
      return {
        ...state,
        ...payload,
      };
    }
    case ACTION_TYPES.AUTHENTICATION_SUCCESS: {
      return {
        ...state,
        isAuthenticated: true,
      };
    }
    case ACTION_TYPES.AUTHENTICATION_FAILURE: {
      return {
        ...state,
        errors: { auth: { message: payload.error.message } as IError },
      };
    }
    case ACTION_TYPES.VERIFICATION_SUCCESS: {
      return {
        ...state,
        isWalletVerified: true,
      };
    }
    case ACTION_TYPES.VERIFICATION_FAILURE: {
      return {
        ...state,
        errors: { verify: { message: payload.error.message } as IError },
      };
    }
    case ACTION_TYPES.ONBOARDING_COMPLETETED: {
      return {
        ...state,
        isOnboardingCompleted: true,
      };
    }
    case ACTION_TYPES.ONBOARDING_FAILURE: {
      return {
        ...state,
        errors: { onboarding: { message: payload.error.message } as IError },
      };
    }
    case ACTION_TYPES.LOGOUT_SUCCESS: {
      return {
        ...state,
        isAuthenticated: false,
      };
    }
    case ACTION_TYPES.LOGOUT_FAILURE: {
      return {
        ...state,
        errors: { auth: { message: payload.error.message } as IError },
      };
    }
    case ACTION_TYPES.CHANGE_NETWORK_SUCCESS: {
      return {
        ...state,
        network: payload.network,
      };
    }
    case ACTION_TYPES.CHANGE_NETWORK_FAILURE: {
      return {
        ...state,
        errors: { settings: { message: payload.error.message } as IError },
      };
    }
    default:
      return state;
  }
};
