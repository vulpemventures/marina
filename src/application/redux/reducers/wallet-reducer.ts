/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { toStringOutpoint } from './../../utils/utxos';
import * as ACTION_TYPES from '../actions/action-types';
import { CosignerExtraData, WalletState } from '../../../domain/wallet';
import { AnyAction } from 'redux';
import { UtxoInterface } from 'ldk';
import { AccountID, MainAccountID, MultisigAccountData } from '../../../domain/account';
import { TxDisplayInterface } from '../../../domain/transaction';
import { Network } from '../../../domain/network';

export const walletInitState: WalletState = {
  mainAccount: {
    accountID: MainAccountID,
    encryptedMnemonic: '',
    masterBlindingKey: '',
    masterXPub: '',
    restorerOpts: {
      lastUsedExternalIndex: 0,
      lastUsedInternalIndex: 0,
    },
  },
  restrictedAssetAccounts: {},
  unspentsAndTransactions: {
    [MainAccountID]: {
      utxosMap: {},
      transactions: { regtest: {}, liquid: {} },
    },
  },
  passwordHash: '',
  deepRestorer: {
    gapLimit: 20,
    isLoading: false,
  },
  isVerified: false,
};

const addUnspent =
  (state: WalletState) =>
  (accountID: AccountID, utxo: UtxoInterface): WalletState => {
    return {
      ...state,
      unspentsAndTransactions: {
        ...state.unspentsAndTransactions,
        [accountID]: {
          ...state.unspentsAndTransactions[accountID],
          utxosMap: {
            ...state.unspentsAndTransactions[accountID].utxosMap,
            [toStringOutpoint(utxo)]: utxo,
          },
        },
      },
    };
  };

const addTx =
  (state: WalletState) =>
  (accountID: AccountID, tx: TxDisplayInterface, network: Network): WalletState => {
    return {
      ...state,
      unspentsAndTransactions: {
        ...state.unspentsAndTransactions,
        [accountID]: {
          ...state.unspentsAndTransactions[accountID],
          transactions: {
            ...state.unspentsAndTransactions[accountID].transactions,
            [network]: {
              ...state.unspentsAndTransactions[accountID].transactions[network],
              [tx.txId]: tx,
            },
          },
        },
      },
    };
  };

export function walletReducer(
  state: WalletState = walletInitState,
  { type, payload }: AnyAction
): WalletState {
  switch (type) {
    case ACTION_TYPES.RESET_WALLET: {
      return walletInitState;
    }

    case ACTION_TYPES.WALLET_SET_DATA: {
      return {
        ...state,
        passwordHash: payload.passwordHash,
        mainAccount: { accountID: MainAccountID, ...payload },
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [MainAccountID]: {
            utxosMap: {},
            transactions: { regtest: {}, liquid: {} },
          },
        },
      };
    }

    case ACTION_TYPES.WALLET_ADD_RESTRICTED_ASSET_ACCOUNT: {
      const data = payload.multisigAccountData as MultisigAccountData<CosignerExtraData>;
      return {
        ...state,
        restrictedAssetAccounts: {
          ...state.restrictedAssetAccounts,
          [data.signerXPub]: data,
        },
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [data.signerXPub]: {
            utxosMap: {},
            transactions: { liquid: {}, regtest: {} },
          },
        },
      };
    }

    case ACTION_TYPES.INCREMENT_INTERNAL_ADDRESS_INDEX: {
      const accountID = payload.accountID as AccountID;
      if (accountID === MainAccountID) {
        return {
          ...state,
          mainAccount: {
            ...state.mainAccount,
            restorerOpts: {
              ...state.mainAccount.restorerOpts,
              lastUsedInternalIndex:
                (state.mainAccount.restorerOpts.lastUsedInternalIndex ?? 0) + 1,
            },
          },
        };
      }

      return {
        ...state,
        restrictedAssetAccounts: {
          ...state.restrictedAssetAccounts,
          [accountID]: {
            ...state.restrictedAssetAccounts[accountID],
            restorerOpts: {
              ...state.restrictedAssetAccounts[accountID].restorerOpts,
              lastUsedInternalIndex:
                (state.restrictedAssetAccounts[accountID].restorerOpts.lastUsedInternalIndex ?? 0) +
                1,
            },
          },
        },
      };
    }

    case ACTION_TYPES.INCREMENT_EXTERNAL_ADDRESS_INDEX: {
      const accountID = payload.accountID as AccountID;
      if (accountID === MainAccountID) {
        return {
          ...state,
          mainAccount: {
            ...state.mainAccount,
            restorerOpts: {
              ...state.mainAccount.restorerOpts,
              lastUsedExternalIndex:
                (state.mainAccount.restorerOpts.lastUsedExternalIndex ?? 0) + 1,
            },
          },
        };
      }

      return {
        ...state,
        restrictedAssetAccounts: {
          ...state.restrictedAssetAccounts,
          [accountID]: {
            ...state.restrictedAssetAccounts[accountID],
            restorerOpts: {
              ...state.restrictedAssetAccounts[accountID].restorerOpts,
              lastUsedExternalIndex:
                (state.restrictedAssetAccounts[accountID].restorerOpts.lastUsedExternalIndex ?? 0) +
                1,
            },
          },
        },
      };
    }

    case ACTION_TYPES.ADD_UTXO: {
      return addUnspent(state)(payload.accountID, payload.utxo);
    }

    case ACTION_TYPES.DELETE_UTXO: {
      if (!state.unspentsAndTransactions[payload.accountID]) {
        return state;
      }

      const {
        [toStringOutpoint({ txid: payload.txid, vout: payload.vout })]: deleted,
        ...utxosMap
      } = state.unspentsAndTransactions[payload.accountID].utxosMap;

      return {
        ...state,
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [payload.accountID]: {
            ...state.unspentsAndTransactions[payload.accountID],
            utxosMap,
          },
        },
      };
    }

    case ACTION_TYPES.ADD_TX: {
      return addTx(state)(payload.accountID, payload.tx, payload.network);
    }

    case ACTION_TYPES.SET_DEEP_RESTORER_GAP_LIMIT: {
      return {
        ...state,
        deepRestorer: { ...state.deepRestorer, gapLimit: payload.gapLimit },
      };
    }

    case ACTION_TYPES.SET_DEEP_RESTORER_IS_LOADING: {
      return {
        ...state,
        deepRestorer: { ...state.deepRestorer, isLoading: payload.isLoading },
      };
    }

    case ACTION_TYPES.SET_DEEP_RESTORER_ERROR: {
      return {
        ...state,
        deepRestorer: { ...state.deepRestorer, error: payload.error },
      };
    }

    case ACTION_TYPES.FLUSH_UTXOS: {
      return {
        ...state,
        unspentsAndTransactions: {
          ...state.unspentsAndTransactions,
          [payload.accountID]: {
            ...state.unspentsAndTransactions[payload.accountID],
            utxosMap: {},
          },
        },
      };
    }

    case ACTION_TYPES.SET_VERIFIED: {
      return {
        ...state,
        isVerified: true,
      };
    }

    default: {
      return state;
    }
  }
}
