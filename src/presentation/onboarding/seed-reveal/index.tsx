import React, { useContext, useEffect, useState } from 'react';
import * as bip39 from 'bip39';
import { useHistory } from 'react-router-dom';
import Button from '../../components/button';
import {
  INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
} from '../../routes/constants';
import Shell from '../../components/shell';
import { AppContext } from '../../../application/store/context';
import { setMnemonic } from '../../../application/store/actions/onboarding';
import RevealMnemonicButton from '../../components/reveal-mnemonic-button';

const SeedReveal: React.FC = () => {
  const history = useHistory();
  const [revealed, setRevealed] = useState(false);
  const [{ onboarding }, dispatch] = useContext(AppContext);

  useEffect(() => {
    if (onboarding.mnemonic === '') {
      dispatch(setMnemonic(bip39.generateMnemonic()));
    }
  });

  const handleRemindMe = () => history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  const handleNext = () => history.push(INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE);
  const handleClickReveal = () => setRevealed(true);

  return (
    <Shell className="space-y-10">
      <div className="grid grid-cols-1 grid-rows-4 gap-5">
        <h1 className="text-3xl font-medium">{'Save your mnemonic phrase'}</h1>
        <div className="max-w-prose row-span-2">
          {revealed ? (
            <p className="font-regular text-base text-center">
              {onboarding.mnemonic || 'Loading...'}
            </p>
          ) : (
            <RevealMnemonicButton onClick={handleClickReveal} />
          )}
        </div>
        <div className="flex flex-wrap">
          <Button className="w-52 m-2" onClick={handleRemindMe} isOutline={true}>
            {'Remind me later'}
          </Button>
          <Button className="w-52 m-2" onClick={handleNext}>
            {'Next'}
          </Button>
        </div>
      </div>
    </Shell>
  );
};

export default SeedReveal;
