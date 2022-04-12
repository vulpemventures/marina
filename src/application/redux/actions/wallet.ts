import {
  SET_DEEP_RESTORER_IS_LOADING,
  SET_ACCOUNT_DATA,
  SET_DEEP_RESTORER_GAP_LIMIT,
  SET_DEEP_RESTORER_ERROR,
  START_DEEP_RESTORATION,
  INCREMENT_EXTERNAL_ADDRESS_INDEX,
  INCREMENT_INTERNAL_ADDRESS_INDEX,
  SET_VERIFIED,
  SET_RESTORER_OPTS,
  POP_UPDATER_LOADER,
  PUSH_UPDATER_LOADER,
  SET_MNEMONIC,
  SET_COVENANT_TEMPLATE,
} from './action-types';
import type { AnyAction } from 'redux';
import type { AccountData, AccountID } from '../../../domain/account';
import type { NetworkString, StateRestorerOpts } from 'ldk';
import type { PasswordHash } from '../../../domain/password-hash';
import type { EncryptedMnemonic } from '../../../domain/encrypted-mnemonic';

export function setEncryptedMnemonic(
  encryptedMnemonic: EncryptedMnemonic,
  passwordHash: PasswordHash
) {
  return {
    type: SET_MNEMONIC,
    payload: {
      encryptedMnemonic,
      passwordHash,
    },
  };
}

// this action is using during onboarding end-of-flow in order to set up the initial main account state + password hash
export function setAccount<T extends AccountData>(accountID: AccountID, accountData: T): AnyAction {
  return {
    type: SET_ACCOUNT_DATA,
    payload: { accountData, accountID },
  };
}

export function setCovenantTemplate(accountID: AccountID, template: string): AnyAction {
  return {
    type: SET_COVENANT_TEMPLATE,
    payload: { accountID, template },
  };
}

export function setRestorerOpts(
  accountID: AccountID,
  restorerOpts: StateRestorerOpts,
  network: NetworkString
): AnyAction {
  return {
    type: SET_RESTORER_OPTS,
    payload: { accountID, restorerOpts, network },
  };
}

export function incrementAddressIndex(accountID: AccountID, network: NetworkString): AnyAction {
  return { type: INCREMENT_EXTERNAL_ADDRESS_INDEX, payload: { accountID, network } };
}

export function incrementChangeAddressIndex(
  accountID: AccountID,
  network: NetworkString
): AnyAction {
  return { type: INCREMENT_INTERNAL_ADDRESS_INDEX, payload: { accountID, network } };
}

export function setDeepRestorerIsLoading(isLoading: boolean): AnyAction {
  return {
    type: SET_DEEP_RESTORER_IS_LOADING,
    payload: { isLoading },
  };
}

export function setDeepRestorerGapLimit(gapLimit: number): AnyAction {
  return {
    type: SET_DEEP_RESTORER_GAP_LIMIT,
    payload: { gapLimit },
  };
}

export function setDeepRestorerError(error: Error | undefined): AnyAction {
  return {
    type: SET_DEEP_RESTORER_ERROR,
    payload: { error: error ? error.message : undefined },
  };
}

export function startDeepRestorer(): AnyAction {
  return {
    type: START_DEEP_RESTORATION,
  };
}

export function setVerified(): AnyAction {
  return { type: SET_VERIFIED };
}

export const popUpdaterLoader = (): AnyAction => ({
  type: POP_UPDATER_LOADER,
});

export const pushUpdaterLoader = (): AnyAction => ({
  type: PUSH_UPDATER_LOADER,
});
