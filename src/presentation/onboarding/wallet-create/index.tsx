import { generateMnemonic } from 'bip39';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { setPasswordAndOnboardingMnemonic } from '../../../application/redux/actions/onboarding';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import Shell from '../../components/shell';
import { INITIALIZE_SEED_PHRASE_ROUTE } from '../../routes/constants';
import OnboardingForm from '../onboarding-form';

const WalletCreate: React.FC = () => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const history = useHistory();

  const onSubmit = async ({
    password,
    makeSecurityAccount,
  }: {
    password: string;
    makeSecurityAccount: boolean;
  }) => {
    await dispatch(
      setPasswordAndOnboardingMnemonic(password, generateMnemonic(), makeSecurityAccount)
    );
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
