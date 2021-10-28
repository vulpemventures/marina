import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Shell from '../../components/shell';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import { setPasswordAndOnboardingMnemonic } from '../../../application/redux/actions/onboarding';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { setVerified } from '../../../application/redux/actions/wallet';
import { MnemonicField } from './mnemonic-field';
import OnboardingForm from '../onboarding-form';

const WalletRestore: React.FC = () => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const history = useHistory();

  const [mnemonic, setMnemonic] = useState<string>('');

  const onSubmit = async ({
    password,
    makeSecurityAccount,
  }: {
    password: string;
    makeSecurityAccount: boolean;
  }) => {
    if (mnemonic === '') throw new Error('need a valid mnemonic');
    await dispatch(setPasswordAndOnboardingMnemonic(password, mnemonic, makeSecurityAccount));
    await dispatch(setVerified());
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
