import {
  WALLET_CREATE_SUCCESS,
  WALLET_DERIVE_ADDRESS_FAILURE,
  WALLET_DERIVE_ADDRESS_SUCCESS,
  WALLET_RESTORE_SUCCESS,
  WALLET_SET_ADDRESS_SUCCESS,
  WALLET_SET_PENDING_TX_SUCCESS,
  WALLET_UNSET_PENDING_TX_SUCCESS,
} from './action-types';
import { nextAddressForWallet } from '../../utils';
import { AnyAction } from 'redux';
import { WalletData } from '../../utils/wallet';
import { IWallet } from '../../../domain/wallet';
import { Network } from '../../../domain/network';
import { Address } from '../../../domain/address';
import { Transaction } from '../../../domain/transaction';
import { ActionWithPayload } from '../../../domain/common';

export function createWallet(
  walletData: WalletData
): AnyAction {
  return {
    type: WALLET_CREATE_SUCCESS,
    payload: walletData,
  }
}

export function restoreWallet(
  walletData: WalletData
): AnyAction {
  return {
    type: WALLET_RESTORE_SUCCESS,
    payload: walletData,
  }
}

/**
 * Derive a new address and persist it in store
 * @param change 
 * @param onSuccess 
 * @param onError 
 */
export async function deriveNewAddress(
  wallet: IWallet,
  network: Network,
  change: boolean,
): Promise<ActionWithPayload<{ address?: Address, error?: any }>> {
  try {
    const address = await nextAddressForWallet(wallet, network, change);
    // Update React state
    return { type: WALLET_DERIVE_ADDRESS_SUCCESS, payload: { address } };
  } catch (error) {
    console.error(error);
    return { type: WALLET_DERIVE_ADDRESS_FAILURE, payload: { error } }
  }
}

export function setAddress(address: Address): ActionWithPayload<{ address?: Address, error?: any }> {
  return {
    type: WALLET_SET_ADDRESS_SUCCESS, payload: { address }
  }
}

export function setPendingTx(tx: Transaction): AnyAction {
  return { type: WALLET_SET_PENDING_TX_SUCCESS, payload: { pendingTx: tx } }
}

export function unsetPendingTx(): AnyAction {
  return { type: WALLET_UNSET_PENDING_TX_SUCCESS }
}
