import {
  AddressInterface,
  EsploraIdentityRestorer,
  fetchAndUnblindUtxos,
  IdentityOpts,
  IdentityType,
  isBlindedUtxo,
  Mnemonic,
  UtxoInterface,
} from 'ldk';
import {
  INIT_WALLET,
  WALLET_CREATE_FAILURE,
  WALLET_CREATE_SUCCESS,
  WALLET_DERIVE_ADDRESS_FAILURE,
  WALLET_DERIVE_ADDRESS_SUCCESS,
  WALLET_RESTORE_FAILURE,
  WALLET_RESTORE_SUCCESS,
  WALLET_SET_PENDING_TX_FAILURE,
  WALLET_SET_PENDING_TX_SUCCESS,
  WALLET_SET_UTXOS_FAILURE,
  WALLET_SET_UTXOS_SUCCESS,
  WALLET_UNSET_PENDING_TX_FAILURE,
  WALLET_UNSET_PENDING_TX_SUCCESS,
} from './action-types';
import { Action, IAppState, Thunk } from '../../../domain/common';
import { encrypt, explorerApiUrl, hash, nextAddressForWallet, toStringOutpoint } from '../../utils';
import { IWallet } from '../../../domain/wallet/wallet';
import {
  Address,
  MasterBlindingKey,
  MasterXPub,
  Mnemonic as Mnemo,
  Password,
} from '../../../domain/wallet/value-objects';
import { Transaction } from '../../../domain/wallet/value-objects/transaction';

export function initWallet(wallet: IWallet): Thunk<IAppState, Action> {
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
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    const { app, wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic) {
      throw new Error(
        'Wallet already exists. Remove the extension from the browser first to create a new one'
      );
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

      await repos.wallet.getOrCreateWallet({
        masterXPub,
        masterBlindingKey,
        encryptedMnemonic,
        passwordHash,
        confidentialAddresses,
        utxoMap,
      });

      // Update React state
      dispatch([
        WALLET_CREATE_SUCCESS,
        {
          confidentialAddresses,
          encryptedMnemonic,
          masterXPub,
          masterBlindingKey,
          passwordHash,
          utxoMap,
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
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    const { app, wallets } = getState();
    if (wallets.length > 0 && wallets[0].encryptedMnemonic) {
      throw new Error(
        'Wallet already exists. Remove the extension from the browser first to create a new one'
      );
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
      const confidentialAddresses: Address[] = mnemonicWallet
        .getAddresses()
        .map(({ confidentialAddress, derivationPath }) =>
          Address.create(confidentialAddress, derivationPath)
        );

      const utxoMap = new Map<string, UtxoInterface>();

      await repos.wallet.getOrCreateWallet({
        masterXPub,
        masterBlindingKey,
        encryptedMnemonic,
        passwordHash,
        confidentialAddresses,
        utxoMap,
      });

      dispatch([
        WALLET_RESTORE_SUCCESS,
        {
          masterXPub,
          masterBlindingKey,
          encryptedMnemonic,
          passwordHash,
          confidentialAddresses,
          utxoMap,
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
  change: boolean,
  onSuccess: (confidentialAddress: string) => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    const { app, wallets } = getState();
    if (!wallets?.[0].masterXPub || !wallets?.[0].masterBlindingKey) {
      throw new Error('Cannot derive new address');
    }

    try {
      const addr = await nextAddressForWallet(wallets[0], app.network.value, change);
      const address = Address.create(addr.value, addr.derivationPath);
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

export function setPendingTx(
  tx: Transaction,
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    const { wallets } = getState();
    if (wallets.length <= 0) {
      throw new Error('Wallet does not exist');
    }
    const wallet = wallets[0];
    try {
      if (wallet.pendingTx) {
        throw new Error(
          'Pending tx already exists, either confirm or reject it before creating a new one'
        );
      }
      await repos.wallet.setPendingTx(tx);
      dispatch([WALLET_SET_PENDING_TX_SUCCESS, { pendingTx: tx }]);
      onSuccess();
    } catch (error) {
      dispatch([WALLET_SET_PENDING_TX_FAILURE, { error }]);
      onError(error);
    }
  };
}

export function unsetPendingTx(
  onSuccess: () => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    const { wallets } = getState();
    if (wallets.length <= 0) {
      throw new Error('Wallet does not exist');
    }
    const wallet = wallets[0];
    try {
      if (!wallet.pendingTx) {
        return;
      }
      await repos.wallet.setPendingTx();
      dispatch([WALLET_UNSET_PENDING_TX_SUCCESS]);
      onSuccess();
    } catch (error) {
      dispatch([WALLET_UNSET_PENDING_TX_FAILURE, { error }]);
      onError(error);
    }
  };
}

/**
 * Check that utxoMapStore and fetchedUtxos have the same set of utxos
 * @param utxoMapStore
 * @param fetchedUtxos
 * @returns boolean - true if utxo sets are equal, false if not
 */
export function compareUtxos(
  utxoMapStore: Map<string, UtxoInterface>,
  fetchedUtxos: UtxoInterface[]
) {
  if (utxoMapStore?.size !== fetchedUtxos?.length) return false;
  for (const outpoint of utxoMapStore.keys()) {
    // At least one outpoint in utxoMapStore is present in fetchedUtxos
    const isEqual = fetchedUtxos.some((utxo) => `${utxo.txid}:${utxo.vout}` === outpoint);
    if (!isEqual) return false;
  }
  return true;
}

export function setUtxos(
  addressesWithBlindingKeys: AddressInterface[],
  onSuccess?: () => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    const { app, wallets } = getState();
    const newMap = new Map(wallets[0].utxoMap);
    try {
      // Fetch utxo(s). Return blinded utxo(s) if unblinding has been skipped
      const fetchedUtxos = await fetchAndUnblindUtxos(
        addressesWithBlindingKeys,
        explorerApiUrl[app.network.value],
        // Skip fetch and unblind if utxo exists in React state
        (utxo) =>
          Array.from(wallets[0].utxoMap.keys()).some(
            (outpoint) => `${utxo.txid}:${utxo.vout}` === outpoint
          )
      );
      if (fetchedUtxos.every((u) => isBlindedUtxo(u))) return onSuccess?.();
      // Add to newMap fetched utxo(s) not present in store
      fetchedUtxos.forEach((fetchedUtxo) => {
        const isPresent = Array.from(wallets[0].utxoMap.keys()).some(
          (storedUtxoOutpoint) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
        );
        if (!isPresent) newMap.set(toStringOutpoint(fetchedUtxo), fetchedUtxo);
      });
      // Delete from newMap utxo(s) not present in fetched utxos
      Array.from(newMap.keys()).forEach((storedUtxoOutpoint) => {
        const isPresent = fetchedUtxos.some(
          (fetchedUtxo) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
        );
        if (!isPresent) newMap.delete(storedUtxoOutpoint);
      });
      await repos.wallet.setUtxos(newMap);
      dispatch([WALLET_SET_UTXOS_SUCCESS, { utxoMap: newMap }]);
      onSuccess?.();
    } catch (error) {
      dispatch([WALLET_SET_UTXOS_FAILURE, { error }]);
      onError?.(error);
    }
  };
}
