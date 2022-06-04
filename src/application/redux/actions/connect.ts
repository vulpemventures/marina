import type { NetworkString, RecipientInterface } from 'ldk';
import type { DataRecipient } from 'marina-provider';
import type { AnyAction } from 'redux';
import type { ConnectData } from '../../../domain/connect';
import {
  DISABLE_WEBSITE,
  ENABLE_WEBSITE,
  FLUSH_MSG,
  FLUSH_SELECTED_HOSTNAME,
  FLUSH_TX,
  SELECT_HOSTNAME,
  SET_CREATE_ACCOUNT_DATA,
  SET_MSG,
  SET_TX_DATA,
} from './action-types';

export function enableWebsite(hostname: string, network: NetworkString): AnyAction {
  return {
    type: ENABLE_WEBSITE,
    payload: { hostname, network },
  };
}

export function disableWebsite(hostname: string, network: NetworkString): AnyAction {
  return {
    type: DISABLE_WEBSITE,
    payload: { hostname, network },
  };
}

export function setMsg(hostname: string, message: string): AnyAction {
  return {
    type: SET_MSG,
    payload: { hostname, message },
  };
}

export function flushMsg(): AnyAction {
  return {
    type: FLUSH_MSG,
  };
}

export function flushTx(): AnyAction {
  return {
    type: FLUSH_TX,
  };
}

export function setTx(hostname: string, pset: string): AnyAction {
  return {
    type: SET_TX_DATA,
    payload: { hostname, pset } as ConnectData['tx'],
  };
}

export function setCreateAccountData(connectData: ConnectData['createAccount']): AnyAction {
  return {
    type: SET_CREATE_ACCOUNT_DATA,
    payload: { connectData },
  };
}

export function setTxData(
  hostname: string,
  recipients: RecipientInterface[],
  feeAssetHash: string,
  network: NetworkString,
  data: DataRecipient[]
): AnyAction {
  return {
    type: SET_TX_DATA,
    payload: { hostname, recipients, feeAssetHash, network, data } as ConnectData['tx'],
  };
}

export function selectHostname(hostname: string, network: NetworkString): AnyAction {
  return {
    type: SELECT_HOSTNAME,
    payload: { hostname, network },
  };
}

export function flushSelectedHostname(network: NetworkString): AnyAction {
  return {
    type: FLUSH_SELECTED_HOSTNAME,
    payload: { network },
  };
}
