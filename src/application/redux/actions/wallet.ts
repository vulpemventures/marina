import { RootState } from '../store';
import { ThunkAction } from 'redux-thunk';
import { EsploraIdentityRestorer, IdentityOpts, IdentityType, Mnemonic, UtxoInterface } from 'ldk';
import {
  INIT_WALLET,
  WALLET_CREATE_FAILURE,
  WALLET_CREATE_SUCCESS,
  WALLET_DERIVE_ADDRESS_FAILURE,
  WALLET_DERIVE_ADDRESS_SUCCESS,
  WALLET_RESTORE_FAILURE,
  WALLET_RESTORE_SUCCESS,
  WALLET_SET_ADDRESS_FAILURE,
  WALLET_SET_ADDRESS_SUCCESS,
  WALLET_SET_PENDING_TX_FAILURE,
  WALLET_SET_PENDING_TX_SUCCESS,
  WALLET_UNSET_PENDING_TX_FAILURE,
  WALLET_UNSET_PENDING_TX_SUCCESS,
} from './action-types';
import { encrypt, hash, nextAddressForWallet } from '../../utils';
import {
  Address,
  MasterBlindingKey,
  MasterXPub,
  Mnemonic as Mnemo,
  Password,
} from '../../../domain/wallet/value-objects';
import { Transaction } from '../../../domain/wallet/value-objects/transaction';
import { AnyAction } from 'redux';

const walletAlreadyExistError = new Error(
  'Wallet already exists. Remove the extension from the browser first to create a new one'
);

/**
 * Create a new wallet and add it to store
 * @param password 
 * @param mnemonic 
 * @param onSuccess 
 * @param onError 
 */
export function createWallet(
  password: Password,
  mnemonic: Mnemo,
  onSuccess: () => void,
  onError: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    const { app, wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic) {
      throw walletAlreadyExistError;
    }

    try {
      const chain = app.network.value;
      const mnemonicWallet = new Mnemonic({
        chain,
        type: IdentityType.Mnemonic,
        value: { mnemonic: mnemonic.value },
      } as IdentityOpts);

      const masterXPub = MasterXPub.create(mnemonicWallet.masterPublicKey);
      const masterBlindingKey = MasterBlindingKey.create(mnemonicWallet.masterBlindingKey);
      const encryptedMnemonic = encrypt(mnemonic, password);
      const passwordHash = hash(password);
      const confidentialAddresses: Address[] = [];
      const utxoMap = new Map<string, UtxoInterface>();

      // Update React state
      const walletCreateSuccessAction: AnyAction = {
        type: WALLET_CREATE_SUCCESS,
        payload: {
          confidentialAddresses,
          encryptedMnemonic,
          masterXPub,
          masterBlindingKey,
          passwordHash,
          utxoMap,
        }
      }
      dispatch(walletCreateSuccessAction);
      onSuccess();
    } catch (error) {
      dispatch({ type: WALLET_CREATE_FAILURE, payload: { error } });
      onError(error);
    }
  };
}

/**
 * Restore wallet from existing mnemonic
 * @param password 
 * @param mnemonic 
 * @param onSuccess 
 * @param onError 
 */
export function restoreWallet(
  password: Password,
  mnemonic: Mnemo,
  onSuccess: () => void,
  onError: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    const { app, wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic) {
      throw walletAlreadyExistError
    }

    const chain = app.network.value;
    let restorer = Mnemonic.DEFAULT_RESTORER;
    if (chain === 'regtest') {
      restorer = new EsploraIdentityRestorer('http://localhost:3001');
    }

    // Restore wallet from mnemonic
    try {
      const mnemonicWallet = new Mnemonic({
        chain,
        restorer,
        type: IdentityType.Mnemonic,
        value: { mnemonic: mnemonic.value },
        initializeFromRestorer: true,
      } as IdentityOpts);

      const masterXPub = MasterXPub.create(mnemonicWallet.masterPublicKey);
      const masterBlindingKey = MasterBlindingKey.create(mnemonicWallet.masterBlindingKey);
      const encryptedMnemonic = encrypt(mnemonic, password);
      const passwordHash = hash(password);
      const isRestored = await mnemonicWallet.isRestored;
      if (!isRestored) {
        throw new Error('Failed to restore wallet');
      }
      const confidentialAddresses: Address[] = (
        await mnemonicWallet.getAddresses()
      ).map(({ confidentialAddress, derivationPath }) =>
        Address.create(confidentialAddress, derivationPath)
      );

      const utxoMap = new Map<string, UtxoInterface>();

      dispatch({
        type: WALLET_RESTORE_SUCCESS,
        payload: {
          masterXPub,
          masterBlindingKey,
          encryptedMnemonic,
          passwordHash,
          confidentialAddresses,
          utxoMap,
        },
      });
      onSuccess();
    } catch (error) {
      dispatch({ type: WALLET_RESTORE_FAILURE, payload: { error } });
      onError(error);
    }
  };
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

export function unsetPendingTx(
  onSuccess: () => void,
  onError: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    const { wallets } = getState();
    if (wallets.length <= 0) {
      throw new Error('Wallet does not exist');
    }
    const wallet = wallets[0];
    try {
      if (!wallet.pendingTx) {
        return;
      }
      dispatch({ type: WALLET_UNSET_PENDING_TX_SUCCESS });
      onSuccess();
    } catch (error) {
      dispatch({ type: WALLET_UNSET_PENDING_TX_FAILURE, payload: { error } });
      onError(error);
    }
  };
}
