import { Outpoint } from 'ldk';
import { ActionWithPayload } from '../../../domain/common';
import { AssetAmount } from '../../../domain/connect';
import { ALLOW_COIN, SET_APPROVE_REQUEST_PARAM } from './action-types';

export function addAllowedCoin(utxo: Outpoint): ActionWithPayload<Outpoint> {
  return {
    type: ALLOW_COIN,
    payload: {
      txid: utxo.txid,
      vout: utxo.vout,
    },
  };
}

export function setApproveParams(
  assetAmounts: AssetAmount[]
): ActionWithPayload<{ assetAmounts: AssetAmount[] }> {
  return {
    type: SET_APPROVE_REQUEST_PARAM,
    payload: {
      assetAmounts,
    },
  };
}
