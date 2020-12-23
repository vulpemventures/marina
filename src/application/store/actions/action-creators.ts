import * as ACTION_TYPES from './action-types';

export const createWallet = () => {
  return {
    type: ACTION_TYPES.WALLET_CREATED,
  };
};

export const completeOnboarding = () => {
  return {
    type: ACTION_TYPES.ONBOARDING_COMPLETETED,
  };
};
