import { Outpoint } from 'ldk';
import { ActionWithPayload } from '../../../domain/common';
import { ALLOW_COIN, SET_ALLOW_COIN } from './action-types';

export function allowCoin(txid: string, vout: number): ActionWithPayload<Outpoint> {
  return {
    type: ALLOW_COIN,
    payload: {
      txid,
      vout,
    },
  };
}

export function setAllowCoinInConnectData(txid: string, vout: number): ActionWithPayload<Outpoint> {
  return {
    type: SET_ALLOW_COIN,
    payload: {
      txid,
      vout,
    },
  };
}
