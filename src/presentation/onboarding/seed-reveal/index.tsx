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
        <div className="max-w-prose relative row-span-2 bg-gray-600">
          <div className="absolute inset-0 flex flex-col justify-center">
            <p className="text-sm text-center">{onboarding.mnemonic || 'Loading...'}</p>
          </div>
          {revealed ? null : (
            <div
              className="bg-opacity-90 hover:bg-opacity-70 absolute inset-0 flex justify-center transition bg-black rounded cursor-pointer"
              onClick={handleClickReveal}
            >
              <div className="flex flex-col justify-center">
                <img src="assets/images/lock.svg" alt="closed lock" className="h-14"></img>
                <p className="text-xl text-white">Reveal mnemonic phrase</p>
              </div>
            </div>
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
