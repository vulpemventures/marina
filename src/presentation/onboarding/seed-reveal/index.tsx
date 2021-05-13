import React, { useContext, useEffect, useState } from 'react';
import * as bip39 from 'bip39';
import { useHistory } from 'react-router-dom';
import Button from '../../components/button';
import {
  INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
} from '../../routes/constants';
import Shell from '../../components/shell';
import { setMnemonic } from '../../../application/store/actions/onboarding';
import RevealMnemonic from '../../components/reveal-mnemonic';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../..';
import { OnboardingState } from '../../../application/store/reducers/onboarding-reducer';

export interface SeedRevealProps {
  onboarding: OnboardingState;
}

const SeedRevealView: React.FC<SeedRevealProps> = ({ onboarding }) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const history = useHistory();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (onboarding.mnemonic === '') {
      dispatch(setMnemonic(bip39.generateMnemonic()));
    }
  });

  const handleRemindMe = () => history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  const handleNext = () => history.push(INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE);
  const handleClickReveal = () => setRevealed(true);

  return (
    <Shell>
      <div className="flex flex-col content-start justify-start space-y-10">
        <h1 className="text-3xl font-medium">{'Save your mnemonic phrase'}</h1>
        <div className="max-w-prose w-96 flex flex-col justify-center h-32">
          {revealed ? (
            <div className="border-primary p-4 text-base font-medium text-left border-2 rounded-md shadow-md">
              {onboarding.mnemonic || 'Loading...'}
            </div>
          ) : (
            <RevealMnemonic className="w-96 h-32 shadow-md" onClick={handleClickReveal} />
          )}
        </div>
        <div className="flex flex-wrap">
          <Button className="w-52 mr-5" onClick={handleRemindMe} isOutline={true}>
            {'Remind me later'}
          </Button>
          <Button className="w-52" onClick={handleNext}>
            {'Next'}
          </Button>
        </div>
      </div>
    </Shell>
  );
};

export default SeedRevealView;
