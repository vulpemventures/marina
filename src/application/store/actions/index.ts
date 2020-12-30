import { RouteComponentProps } from 'react-router-dom';
import { IdentityOpts, IdentityType, Mnemonic } from 'tdex-sdk';
import { WALLET_RESTORE_FAILURE, WALLET_RESTORE_SUCCESS } from './action-types';
import { Thunk } from '../reducers/use-thunk-reducer';
import {
  INITIALIZE_END_OF_FLOW_ROUTE,
  INITIALIZE_SEED_PHRASE_ROUTE,
} from '../../../presentation/routes/constants';
import { IAppState } from '../../../domain/common';

// TDex Wallet instance
export let tdexWallet: Mnemonic;

export function restoreWallet(
  mnemonic: string,
  history: RouteComponentProps['history']
): Thunk<IAppState, [string, Record<string, unknown>]> {
  return (dispatch, getState) => {
    // Check if mnemonic already exists
    const { wallets } = getState();
    if (wallets[0].mnemonic) throw new Error('This wallet already exists');
    // Restore wallet from mnemonic
    try {
      tdexWallet = new Mnemonic({
        chain: 'regtest',
        type: IdentityType.Mnemonic,
        value: { mnemonic },
      } as IdentityOpts);
      // Update React state
      dispatch([WALLET_RESTORE_SUCCESS, { mnemonic }]);
      // Navigate
      history.push(INITIALIZE_END_OF_FLOW_ROUTE);
    } catch (error) {
      dispatch([WALLET_RESTORE_FAILURE, { error }]);
    }
  };
}

// TODO: decide what to do with password from createWallet screen
export function setPassword(
  password: string,
  history: RouteComponentProps['history']
): Thunk<IAppState, [string, Record<string, unknown>]> {
  return () => {
    console.log('password', password);
    history.push(INITIALIZE_SEED_PHRASE_ROUTE);
  };
}
