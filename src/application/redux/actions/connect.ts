import { AnyAction } from "redux";
import { NetworkValue } from "../../../domain/app/value-objects";
import { ConnectData } from "../../../domain/connect";
import { DISABLE_WEBSITE, ENABLE_WEBSITE, FLUSH_MSG, FLUSH_TX, SET_MSG, SET_TX } from "./action-types";

export function enableWebsite(hostname: string, network: NetworkValue): AnyAction {
  return {
    type: ENABLE_WEBSITE,
    payload: { hostname, network }
  }
}

export function disableWebsite(hostname: string, network: NetworkValue): AnyAction {
  return {
    type: DISABLE_WEBSITE,
    payload: { hostname, network }
  }
}

export function setMsg(hostname: string, message: string, network: NetworkValue): AnyAction {
  return {
    type: SET_MSG,
    payload: { hostname, message, network }
  }
}

export function flushMsg(network: NetworkValue): AnyAction {
  return {
    type: FLUSH_MSG,
    payload: { network }
  }
}

export function flushTx(network: NetworkValue): AnyAction {
  return {
    type: FLUSH_TX,
    payload: { network }
  }
}

export function setTx(hostname: string, pset: string, network: NetworkValue): AnyAction {
  return {
    type: SET_TX,
    payload: { hostname, pset, network } as ConnectData['tx']
  }
}

export function setTxData(hostname: string, recipient: string, amount: string, assetHash: string, network: NetworkValue): AnyAction {
  return {
    type: SET_TX,
    payload: { hostname, recipient, amount, assetHash, network } as ConnectData['tx']
  }
}