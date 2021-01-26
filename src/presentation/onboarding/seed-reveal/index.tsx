import React, { useContext, useEffect } from 'react';
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
  const [{ onboarding }, dispatch] = useContext(AppContext);

  useEffect(() => {
    if (onboarding.mnemonic === '') {
      dispatch(setMnemonic(bip39.generateMnemonic()));
    }
  })

  const handleRemindMe = () => history.push(INITIALIZE_END_OF_FLOW_ROUTE)
  const handleNext = () => history.push(INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE)

  return (
    <Shell className="space-y-10">
      <h1 className="text-3xl font-medium">{'Save your mnemonic phrase'}</h1>
      <p className="">{onboarding.mnemonic || 'Loading...'}</p>
      <div className="space-x-20">
        <Button className="w-52" onClick={handleRemindMe} isOutline={true}>
          {'Remind me later'}
        </Button>
        <Button className="w-52" onClick={handleNext}>
          {'Next'}
        </Button>
      </div>
    </Shell>
  );
};

export default SeedReveal;
