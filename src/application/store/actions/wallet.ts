import { RouteComponentProps } from 'react-router-dom';
import {
  IdentityOpts,
  IdentityType,
  Mnemonic,
  EsploraIdentityRestorer,
} from 'tdex-sdk';
import {
  AUTHENTICATION_SUCCESS,
  AUTHENTICATION_FAILURE,
  WALLET_CREATE_FAILURE,
  WALLET_CREATE_SUCCESS,
  WALLET_RESTORE_FAILURE,
  WALLET_RESTORE_SUCCESS,
} from './action-types';
import {
  DEFAULT_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
} from '../../../presentation/routes/constants';
import { IAppState, Thunk } from '../../../domain/common';
import { encrypt, decrypt } from '../../utils/crypto';
import { WebExtStorageWalletRepo } from '../../../infrastructure/wallet/webext-storage-wallet-repository';

const repo: WebExtStorageWalletRepo = new WebExtStorageWalletRepo();

export function createWallet(
  password: string,
  mnemonic: string,
  chain: string,
  history: RouteComponentProps['history']
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState) => {
    // Check if mnemonic already exists
    // Should we source the wallets state from repo for those actions that persist part of it?
    const { wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic){ 
      throw new Error('This wallet already exists');
    }

    try {
      const mnemonicWallet = new Mnemonic({
        chain,
        type: IdentityType.Mnemonic,
        value: { mnemonic },
      } as IdentityOpts);

      const masterXPub = mnemonicWallet.masterPrivateKeyNode.neutered().toBase58()
      const masterBlindKey = mnemonicWallet.masterBlindingKeyNode.masterKey()
      const encryptedMnemonic = encrypt(mnemonic, password)

      await repo.getOrCreateWallet({masterXPub, masterBlindKey, encryptedMnemonic})

      // Update React state
      dispatch([
        WALLET_CREATE_SUCCESS,
        {
          masterXPub,
          masterBlindKey,
          encryptedMnemonic,
        }
      ]);

      // Navigate
      history.push(INITIALIZE_END_OF_FLOW_ROUTE);
    } catch (error) {
      dispatch([WALLET_CREATE_FAILURE, { error }]);
    }
  }
}

export function restoreWallet(
  password: string,
  mnemonic: string,
  chain: string,
  history: RouteComponentProps['history']
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState) => {
    // Check if mnemonic already exists
    const { wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic){ 
      throw new Error('This wallet already exists');
    }

    let restorer = Mnemonic.DEFAULT_RESTORER
    if (chain == 'regtest') {
      restorer = new EsploraIdentityRestorer('http://localhost:3001')
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

      const masterXPub = mnemonicWallet.masterPrivateKeyNode.neutered().toBase58()
      const masterBlindKey = mnemonicWallet.masterBlindingKeyNode.masterKey()
      const encryptedMnemonic = encrypt(mnemonic, password)

      await repo.getOrCreateWallet({masterXPub, masterBlindKey, encryptedMnemonic})

      dispatch([
        WALLET_CREATE_SUCCESS,
        {
          masterXPub,
          masterBlindKey,
          encryptedMnemonic,
        }
      ]);


      const isRestored = await mnemonicWallet.isRestored
      if (!isRestored) {
        throw new Error('Failed to restore wallet')
      }

      // Update React state
      dispatch([WALLET_RESTORE_SUCCESS, {}]);
      // Navigate
      history.push(INITIALIZE_END_OF_FLOW_ROUTE);
    } catch (error) {
      dispatch([WALLET_RESTORE_FAILURE, { error }]);
    }
  };
}

export function logIn(
  password: string,
  history: RouteComponentProps['history']
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return (dispatch, getState) => {
    const { wallets } = getState();
    if (wallets.length <= 0 || wallets[0].encryptedMnemonic === undefined){ 
      throw new Error('The wallet does not exist');
    }

    const wallet = wallets[0]
    try {
      // TODO: maybe just check password hash?
      decrypt(wallet.encryptedMnemonic, password)
      // Success
      dispatch([AUTHENTICATION_SUCCESS]);
      history.push(DEFAULT_ROUTE);
    } catch(error) {
      dispatch([AUTHENTICATION_FAILURE, { error }]);
    }
  };
}
