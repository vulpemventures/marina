import { Network } from './../../../domain/network';
import { AnyAction } from "redux";
import * as ACTION_TYPES from '../actions/action-types';
import { ConnectData, ConnectDataByNetwork, newEmptyConnectData } from "../../../domain/connect";

const connectDataInitState: ConnectDataByNetwork = {
  regtest: newEmptyConnectData(),
  liquid: newEmptyConnectData(),
}

export function connectDataReducer(state: ConnectDataByNetwork = connectDataInitState, { type, payload }: AnyAction): ConnectDataByNetwork {
  switch (type) {
    case ACTION_TYPES.ENABLE_WEBSITE: {
      const current = state[payload.Network as Network];
      return {
        ...state, [payload.network]: { ...current, enabledSites: [...current.enabledSites, payload.hostname] } as ConnectData
      };
    }

    case ACTION_TYPES.DISABLE_WEBSITE: {
      const current = state[payload.network as Network];
      return {
        ...state, [payload.network]: { ...current, enabledSites: current.enabledSites.filter(v => v !== payload.hostname) } as ConnectData
      };
    }

    case ACTION_TYPES.SET_MSG: {
      const current = state[payload.network as Network];
      return {
        ...state, [payload.network]: { ...current, msg: { hostname: payload.hostname, message: payload.message } } as ConnectData
      };
    }

    case ACTION_TYPES.FLUSH_MSG: {
      const current = state[payload.network as Network];
      return {
        ...state, [payload.network]: { ...current, msg: undefined } as ConnectData
      };
    }

    case ACTION_TYPES.SET_TX: {
      const current = state[payload.network as Network];
      return {
        ...state, [payload.network]: { ...current, tx: payload } as ConnectData
      };
    }

    case ACTION_TYPES.SELECT_HOSTNAME: {
      const current = state[payload.network as Network];
      return {
        ...state, [payload.network]: { ...current, hostnameSelected: payload.hostname } as ConnectData
      }
    }

    case ACTION_TYPES.FLUSH_SELECTED_HOSTNAME: {
      const current = state[payload.network as Network];
      return {
        ...state, [payload.network]: { ...current, hostnameSelected: '' } as ConnectData
      }
    }

    default:
      return state;
  }
};
