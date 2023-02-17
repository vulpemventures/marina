import { generateMnemonic } from 'bip39';
import React from 'react';
import { useHistory } from 'react-router';
import { init } from '../../../domain/repository';
import {
  appRepository,
  onboardingRepository,
  sendFlowRepository,
} from '../../../infrastructure/storage/common';
import Shell from '../../components/shell';
import { INITIALIZE_SEED_PHRASE_ROUTE } from '../../routes/constants';
import OnboardingForm from '../onboarding-form';

const WalletCreate: React.FC = () => {
  const history = useHistory();

  const onSubmit = async ({ password }: { password: string }) => {
    await init(appRepository, sendFlowRepository);
    await onboardingRepository.setOnboardingPasswordAndMnemonic(password, generateMnemonic());
    history.push(INITIALIZE_SEED_PHRASE_ROUTE);
  };

  return (
    <Shell className="space-y-10">
      <h1 className="mb-5 text-3xl font-medium">Create password</h1>
      <OnboardingForm onSubmit={onSubmit} />
    </Shell>
  );
};

export default WalletCreate;
