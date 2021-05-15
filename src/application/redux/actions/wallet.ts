import { RootState } from '../store';
import { ThunkAction } from 'redux-thunk';
import {
  WALLET_CREATE_SUCCESS,
  WALLET_DERIVE_ADDRESS_FAILURE,
  WALLET_DERIVE_ADDRESS_SUCCESS,
  WALLET_RESTORE_SUCCESS,
  WALLET_SET_ADDRESS_FAILURE,
  WALLET_SET_ADDRESS_SUCCESS,
  WALLET_SET_PENDING_TX_FAILURE,
  WALLET_SET_PENDING_TX_SUCCESS,
  WALLET_UNSET_PENDING_TX_FAILURE,
  WALLET_UNSET_PENDING_TX_SUCCESS,
} from './action-types';
import { nextAddressForWallet } from '../../utils';
import {
  Address,
} from '../../../domain/wallet/value-objects';
import { Transaction } from '../../../domain/wallet/value-objects/transaction';
import { AnyAction } from 'redux';
import { WalletData } from '../../utils/wallet';

const walletAlreadyExistError = new Error(
  'Wallet already exists. Remove the extension from the browser first to create a new one'
);

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
export function deriveNewAddress(
  change: boolean,
  onSuccess: (address: Address) => void,
  onError: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    const { app, wallets } = getState();
    if (!wallets?.[0].masterXPub || !wallets?.[0].masterBlindingKey) {
      throw new Error('Cannot derive new address');
    }

    try {
      const addr = await nextAddressForWallet(wallets[0], app.network.value, change);
      const address = Address.create(addr.value, addr.derivationPath);
      // Update React state
      dispatch({ type: WALLET_DERIVE_ADDRESS_SUCCESS, payload: { address } });
      onSuccess(address);
    } catch (error) {
      dispatch({ type: WALLET_DERIVE_ADDRESS_FAILURE, payload: { error } });
      onError(error);
    }
  };
}

export function setAddress(
  address: Address,
  onSuccess?: (address: Address) => void,
  onError?: (error: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch) => {
    try {
      dispatch({ type: WALLET_SET_ADDRESS_SUCCESS, payload: { address } });
      onSuccess?.(address);
    } catch (error) {
      dispatch({ type: WALLET_SET_ADDRESS_FAILURE, payload: { error } });
      onError?.(error);
    }
  };
}

export function setPendingTx(
  tx: Transaction,
  onSuccess: () => void,
  onError: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    const { wallets } = getState();
    if (wallets.length <= 0) {
      throw new Error('Wallet does not exist');
    }
    try {
      dispatch({ type: WALLET_SET_PENDING_TX_SUCCESS, payload: { pendingTx: tx } });
      onSuccess();
    } catch (error) {
      dispatch({ type: WALLET_SET_PENDING_TX_FAILURE, payload: { error } });
      onError(error);
    }
  };
}

export function unsetPendingTx(): AnyAction {
  return { type: WALLET_UNSET_PENDING_TX_SUCCESS }
}
