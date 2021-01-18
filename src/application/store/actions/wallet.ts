import { IdentityOpts, IdentityType, Mnemonic, EsploraIdentityRestorer } from 'tdex-sdk';
import {
  INIT_WALLET,
  WALLET_CREATE_FAILURE,
  WALLET_CREATE_SUCCESS,
  WALLET_RESTORE_FAILURE,
  WALLET_RESTORE_SUCCESS,
} from './action-types';
import { IAppState, Thunk } from '../../../domain/common';
import { encrypt, hash } from '../../utils/crypto';
import { IWallet } from '../../../domain/wallet/wallet';

export function initWallet(wallet: IWallet): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return (dispatch, getState, repos) => {
    const { wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic) {
      throw new Error(
        'Wallet already exists. Remove the extension from the browser first to create a new one'
      );
    }
    dispatch([INIT_WALLET, { ...wallet }]);
  };
}

export function createWallet(
  password: string,
  mnemonic: string,
  chain: string,
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState, repos) => {
    const { wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic) {
      throw new Error(
        'Wallet already exists. Remove the extension from the browser first to create a new one'
      );
    }

    try {
      const mnemonicWallet = new Mnemonic({
        chain,
        type: IdentityType.Mnemonic,
        value: { mnemonic },
      } as IdentityOpts);

      const masterXPub = mnemonicWallet.masterPublicKey;
      const masterBlindKey = mnemonicWallet.masterBlindingKey;
      const encryptedMnemonic = encrypt(mnemonic, password);
      const passwordHash = hash(password);

      await repos.wallet.getOrCreateWallet({
        masterXPub,
        masterBlindKey,
        encryptedMnemonic,
        passwordHash,
      });

      // Update React state
      dispatch([
        WALLET_CREATE_SUCCESS,
        {
          masterXPub,
          masterBlindKey,
          encryptedMnemonic,
          passwordHash,
        },
      ]);

      onSuccess();
    } catch (error) {
      dispatch([WALLET_CREATE_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function restoreWallet(
  password: string,
  mnemonic: string,
  chain: string,
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState, repos) => {
    const { wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic) {
      throw new Error(
        'Wallet already exists. Remove the extension from the browser first to create a new one'
      );
    }

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
        value: { mnemonic },
        initializeFromRestorer: true,
      } as IdentityOpts);

      const masterXPub = mnemonicWallet.masterPublicKey;
      const masterBlindKey = mnemonicWallet.masterBlindingKey;
      const encryptedMnemonic = encrypt(mnemonic, password);
      const passwordHash = hash(password);

      await repos.wallet.getOrCreateWallet({
        masterXPub,
        masterBlindKey,
        encryptedMnemonic,
        passwordHash,
      });

      dispatch([
        WALLET_CREATE_SUCCESS,
        {
          masterXPub,
          masterBlindKey,
          encryptedMnemonic,
          passwordHash,
        },
      ]);

      const isRestored = await mnemonicWallet.isRestored;
      if (!isRestored) {
        throw new Error('Failed to restore wallet');
      }

      // Update React state
      dispatch([WALLET_RESTORE_SUCCESS, {}]);
      onSuccess();
    } catch (error) {
      dispatch([WALLET_RESTORE_FAILURE, { error }]);
      onError(error);
    }
  };
}
