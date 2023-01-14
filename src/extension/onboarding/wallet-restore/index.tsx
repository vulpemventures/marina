import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Shell from '../../components/shell';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import { MnemonicField } from './mnemonic-field';
import OnboardingForm from '../onboarding-form';
import { init } from '../../../infrastructure/repository';
import {
  appRepository,
  onboardingRepository,
  sendFlowRepository,
} from '../../../infrastructure/storage/common';

const WalletRestore: React.FC = () => {
  const history = useHistory();
  const [mnemonic, setMnemonic] = useState<string>('');

  const onSubmit = async ({ password }: { password: string }) => {
    if (mnemonic === '') throw new Error('need a valid mnemonic');
    await init(appRepository, sendFlowRepository);
    await onboardingRepository.setOnboardingPasswordAndMnemonic(password, mnemonic);
    await appRepository.updateStatus({ isMnemonicVerified: true }); // set the mnemonic as verified cause we are in the restore mnemonic flow
    history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  };

  return (
    <Shell>
      <h2 className="mb-4 text-3xl font-medium">{'Restore a wallet from a mnemonic phrase'}</h2>
      <p className="mb-2 font-medium">
        Enter your secret twelve words of your mnemonic phrase to Restore your wallet
      </p>
      <MnemonicField value={mnemonic} onChange={(mnemo) => setMnemonic(mnemo)} />
      <OnboardingForm onSubmit={onSubmit} />
    </Shell>
  );
};

export default WalletRestore;
