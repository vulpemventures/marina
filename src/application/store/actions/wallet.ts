import {
  IdentityOpts,
  IdentityType,
  Mnemonic,
  EsploraIdentityRestorer,
  MasterPublicKey,
  fromXpub,
} from 'ldk';
import {
  INIT_WALLET,
  WALLET_CREATE_FAILURE,
  WALLET_CREATE_SUCCESS,
  WALLET_DERIVE_ADDRESS_FAILURE,
  WALLET_DERIVE_ADDRESS_SUCCESS,
  WALLET_RESTORE_FAILURE,
  WALLET_RESTORE_SUCCESS,
} from './action-types';
import { IAppState, Thunk } from '../../../domain/common';
import { encrypt, hash } from '../../utils/crypto';
import IdentityRestorerFromState from '../../utils/restorer';
import { IWallet } from '../../../domain/wallet/wallet';
import {
  Address,
  MasterBlindingKey,
  MasterXPub,
  Mnemonic as Mnemo,
  Password,
} from '../../../domain/wallet/value-objects';

export function initWallet(wallet: IWallet): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return (dispatch, getState) => {
    const { wallets } = getState();
    if (wallets.length <= 0) {
      dispatch([INIT_WALLET, { ...wallet }]);
    }
  };
}

export function createWallet(
  password: Password,
  mnemonic: Mnemo,
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
        value: { mnemonic: mnemonic.value },
      } as IdentityOpts);

      const masterXPub = MasterXPub.create(mnemonicWallet.masterPublicKey);
      const masterBlindingKey = MasterBlindingKey.create(mnemonicWallet.masterBlindingKey);
      const encryptedMnemonic = encrypt(mnemonic, password);
      const passwordHash = hash(password);
      const derivedAddresses: Address[] = [];

      await repos.wallet.getOrCreateWallet({
        masterXPub,
        masterBlindingKey,
        encryptedMnemonic,
        passwordHash,
        derivedAddresses,
      });

      // Update React state
      dispatch([
        WALLET_CREATE_SUCCESS,
        {
          masterXPub,
          masterBlindingKey,
          encryptedMnemonic,
          passwordHash,
          derivedAddresses,
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
  password: Password,
  mnemonic: Mnemo,
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
      const derivedAddresses: Address[] = mnemonicWallet.getAddresses().map(
        ({confidentialAddress}) => Address.create(confidentialAddress),
      );

      await repos.wallet.getOrCreateWallet({
        masterXPub,
        masterBlindingKey,
        encryptedMnemonic,
        passwordHash,
        derivedAddresses,
      });

      dispatch([
        WALLET_RESTORE_SUCCESS,
        {
          masterXPub,
          masterBlindingKey,
          encryptedMnemonic,
          passwordHash,
          derivedAddresses,
        },
      ]);
      onSuccess();
    } catch (error) {
      dispatch([WALLET_RESTORE_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function deriveNewAddress(
  chain: string,
  change: boolean,
  onSuccess: (confidentialAddress: string) => void,
  onError: (err: Error) => void
): Thunk<IAppState, [string, Record<string, unknown>?]> {
  return async (dispatch, getState, repos) => {
    const { wallets } = getState();
    if (!wallets?.[0].masterXPub || !wallets?.[0].masterBlindingKey) {
      throw new Error('Cannot derive new address');
    }

    const { derivedAddresses, masterBlindingKey, masterXPub } = wallets[0];
    const restorer = new IdentityRestorerFromState(derivedAddresses.map(addr => addr.value));
    // Restore wallet from MasterPublicKey
    try {
      const pubKeyWallet = new MasterPublicKey({
        chain,
        restorer,
        type: IdentityType.MasterPublicKey,
        value: {
          masterPublicKey: fromXpub(masterXPub.value, chain),
          masterBlindingKey: masterBlindingKey.value,
        },
        initializeFromRestorer: true,
      });
      const isRestored = await pubKeyWallet.isRestored;
      if (!isRestored) {
        throw new Error('Failed to restore wallet');
      }

      let nextAddress: string;
      if (change) {
        nextAddress = pubKeyWallet.getNextChangeAddress().confidentialAddress;
      } else {
        nextAddress = pubKeyWallet.getNextAddress().confidentialAddress;
      }

      const address = Address.create(nextAddress)
      await repos.wallet.addDerivedAddress(address);

      // Update React state
      dispatch([WALLET_DERIVE_ADDRESS_SUCCESS, { address }]);
      onSuccess(address.value);
    } catch (error) {
      dispatch([WALLET_DERIVE_ADDRESS_FAILURE, { error }]);
      onError(error);
    }
  };
}
