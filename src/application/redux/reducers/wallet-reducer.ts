/* eslint-disable @typescript-eslint/restrict-plus-operands */
import * as ACTION_TYPES from '../actions/action-types';
import type { WalletState } from '../../../domain/wallet';
import type { AnyAction } from 'redux';
import type { AccountData, AccountID, CustomScriptAccountData } from '../../../domain/account';
import { AccountType, initialRestorerOpts, MainAccountID } from '../../../domain/account';
import type { NetworkString } from 'ldk';

export const walletInitState: WalletState = {
  encryptedMnemonic: '',
  accounts: {
    [MainAccountID]: {
      type: AccountType.MainAccount,
      masterBlindingKey: '',
      masterXPub: '',
      restorerOpts: {
        liquid: initialRestorerOpts,
        testnet: initialRestorerOpts,
        regtest: initialRestorerOpts,
      },
    },
  },
  passwordHash: '',
  deepRestorer: {
    gapLimit: 20,
    restorerLoaders: 0,
  },
  updaterLoaders: 0,
  isVerified: false,
};

export function walletReducer(
  state: WalletState = walletInitState,
  { type, payload }: AnyAction
): WalletState {
  switch (type) {
    case ACTION_TYPES.RESET_WALLET: {
      return walletInitState;
    }

    case ACTION_TYPES.SET_RESTORER_OPTS: {
      const accountID = payload.accountID as AccountID;
      const network = payload.network as NetworkString;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [accountID]: {
            ...state.accounts[accountID],
            restorerOpts: {
              ...state.accounts[accountID].restorerOpts,
              [network]: payload.restorerOpts,
            },
          },
        },
      };
    }

    case ACTION_TYPES.SET_MNEMONIC: {
      return {
        ...state,
        encryptedMnemonic: payload.encryptedMnemonic,
        passwordHash: payload.passwordHash,
      };
    }

    case ACTION_TYPES.SET_CS_ACCOUNT_IS_SPENDABLE_BY_MARINA: {
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [payload.accountID as AccountID]: {
            ...state.accounts[payload.accountID],
            contractTemplate: {
              ...state.accounts[payload.accountID].contractTemplate,
              isSpendableByMarina: payload.isSpendableByMarina,
            },
          },
        },
      };
    }

    case ACTION_TYPES.SET_CS_ACCOUNT_TEMPLATE: {
      const accountID = payload.accountID as AccountID;
      if (state.accounts[accountID]?.type !== AccountType.CustomScriptAccount) return state;

      const accountWithTemplate: CustomScriptAccountData = {
        ...(state.accounts[accountID] as CustomScriptAccountData),
        contractTemplate: {
          namespace: payload.accountID,
          template: payload.template,
          changeTemplate: payload.changeTemplate,
        },
      };

      return {
        ...state,
        accounts: {
          ...state.accounts,
          [accountID]: accountWithTemplate,
        },
      };
    }

    case ACTION_TYPES.SET_ACCOUNT_DATA: {
      const data = payload.accountData as AccountData;
      const accountID = payload.accountID as AccountID;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [accountID]: data,
        },
      };
    }

    case ACTION_TYPES.INCREMENT_INTERNAL_ADDRESS_INDEX: {
      const accountID = payload.accountID as AccountID;
      const network = payload.network as NetworkString;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [accountID]: {
            ...state.accounts[accountID],
            restorerOpts: {
              ...state.accounts[accountID]?.restorerOpts,
              [network]: {
                ...state.accounts[accountID]?.restorerOpts[network],
                lastUsedInternalIndex: increment(
                  state.accounts[accountID]?.restorerOpts[network]?.lastUsedInternalIndex
                ),
              },
            },
          },
        },
      };
    }

    case ACTION_TYPES.INCREMENT_EXTERNAL_ADDRESS_INDEX: {
      const accountID = payload.accountID as AccountID;
      const network = payload.network as NetworkString;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [accountID]: {
            ...state.accounts[accountID],
            restorerOpts: {
              ...state.accounts[accountID]?.restorerOpts,
              [network]: {
                ...state.accounts[accountID]?.restorerOpts[network],
                lastUsedExternalIndex: increment(
                  state.accounts[accountID]?.restorerOpts[network]?.lastUsedExternalIndex
                ),
              },
            },
          },
        },
      };
    }

    case ACTION_TYPES.SET_CUSTOM_CONSTRUCTOR_PARAMS: {
      const accountID = payload.accountID as AccountID;
      const network = payload.network as NetworkString;
      const customParams = payload.constructorsParams as Record<string, string | number>;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [accountID]: {
            ...state.accounts[accountID],
            restorerOpts: {
              ...state.accounts[accountID]?.restorerOpts,
              [network]: {
                ...state.accounts[accountID]?.restorerOpts[network],
                customParamsByIndex: {
                  ...state.accounts[accountID]?.restorerOpts[network].customParamsByIndex,
                  [state.accounts[accountID]?.restorerOpts[network].lastUsedExternalIndex]:
                    customParams,
                },
              },
            },
          },
        },
      };
    }

    case ACTION_TYPES.SET_CUSTOM_CHANGE_CONSTRUCTOR_PARAMS: {
      const accountID = payload.accountID as AccountID;
      const network = payload.network as NetworkString;
      const customParams = payload.constructorsParams as Record<string, string | number>;
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [accountID]: {
            ...state.accounts[accountID],
            restorerOpts: {
              ...state.accounts[accountID]?.restorerOpts,
              [network]: {
                ...state.accounts[accountID]?.restorerOpts[network],
                customChangeParamsByIndex: {
                  ...state.accounts[accountID]?.restorerOpts[network].customParamsByIndex,
                  [state.accounts[accountID]?.restorerOpts[network].lastUsedInternalIndex]:
                    customParams,
                },
              },
            },
          },
        },
      };
    }

    case ACTION_TYPES.SET_DEEP_RESTORER_GAP_LIMIT: {
      return {
        ...state,
        deepRestorer: { ...state.deepRestorer, gapLimit: payload.gapLimit },
      };
    }

    case ACTION_TYPES.SET_DEEP_RESTORER_ERROR: {
      return {
        ...state,
        deepRestorer: { ...state.deepRestorer, error: payload.error },
      };
    }

    case ACTION_TYPES.SET_VERIFIED: {
      return {
        ...state,
        isVerified: true,
      };
    }

    case ACTION_TYPES.PUSH_UPDATER_LOADER: {
      return {
        ...state,
        updaterLoaders: neverNegative(state.updaterLoaders + 1),
      };
    }

    case ACTION_TYPES.POP_UPDATER_LOADER: {
      return {
        ...state,
        updaterLoaders: neverNegative(state.updaterLoaders - 1),
      };
    }

    case ACTION_TYPES.PUSH_RESTORER_LOADER: {
      return {
        ...state,
        deepRestorer: {
          ...state.deepRestorer,
          restorerLoaders: neverNegative(state.deepRestorer.restorerLoaders + 1),
        },
      };
    }

    case ACTION_TYPES.POP_RESTORER_LOADER: {
      return {
        ...state,
        deepRestorer: {
          ...state.deepRestorer,
          restorerLoaders: neverNegative(state.deepRestorer.restorerLoaders - 1),
        },
      };
    }

    default: {
      return state;
    }
  }
}

const neverNegative = (n: number) => {
  if (n < 0) return 0;
  return n;
};

const increment = (n: number | undefined): number => {
  if (n === undefined || n === null || n === -1) return 0;
  if (n < 0) return 1; // -Infinity = 0, return 0+1=1
  return n + 1;
};
