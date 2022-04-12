import type { AnyAction } from 'redux';
import * as ACTION_TYPES from '../actions/action-types';
import type { ConnectData } from '../../../domain/connect';
import { newEmptyConnectData } from '../../../domain/connect';
import type { NetworkString } from 'ldk';

export const connectDataInitState: ConnectData = newEmptyConnectData();

export function connectDataReducer(
  state: ConnectData = connectDataInitState,
  { type, payload }: AnyAction
): ConnectData {
  switch (type) {
    case ACTION_TYPES.RESET_CONNECT: {
      return connectDataInitState;
    }

    case ACTION_TYPES.ENABLE_WEBSITE: {
      return {
        ...state,
        enabledSites: {
          ...state.enabledSites,
          [payload.network]: [
            ...state.enabledSites[payload.network as NetworkString],
            payload.hostname,
          ],
        },
      };
    }

    case ACTION_TYPES.DISABLE_WEBSITE: {
      return {
        ...state,
        enabledSites: {
          ...state.enabledSites,
          [payload.network]: state.enabledSites[payload.network as NetworkString].filter(
            (v) => v !== payload.hostname
          ),
        },
      };
    }

    case ACTION_TYPES.SET_MSG: {
      return {
        ...state,
        msg: { hostname: payload.hostname, message: payload.message },
      };
    }

    case ACTION_TYPES.FLUSH_MSG: {
      return {
        ...state,
        msg: undefined,
      };
    }

    case ACTION_TYPES.SET_TX_DATA: {
      return {
        ...state,
        tx: payload,
      };
    }

    case ACTION_TYPES.SET_CREATE_ACCOUNT_DATA: {
      return {
        ...state,
        createAccount: payload.connectData,
      };
    }

    case ACTION_TYPES.SELECT_HOSTNAME: {
      return {
        ...state,
        hostnameSelected: payload.hostname,
      };
    }

    case ACTION_TYPES.FLUSH_SELECTED_HOSTNAME: {
      return {
        ...state,
        hostnameSelected: '',
      };
    }

    default:
      return state;
  }
}
