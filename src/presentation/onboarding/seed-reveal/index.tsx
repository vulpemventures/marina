import React from 'react';
import * as bip39 from 'bip39';
import Button from '../../components/button';
import { useHistory, useLocation } from 'react-router-dom';
import {
  INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
} from '../../routes/constants';
import Shell from '../../components/shell';

interface LocationState {
  password: string;
}

const SeedReveal: React.FC = () => {
  const history = useHistory();
  const mnemonic = bip39.generateMnemonic();
  const { state } = useLocation<LocationState>();
  const nextState = { mnemonic: mnemonic, password: state.password };
  const handleRemindMe = () =>
    history.push({
      pathname: INITIALIZE_END_OF_FLOW_ROUTE,
      state: nextState,
    });
  const handleNext = () =>
    history.push({
      pathname: INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
      state: nextState,
    });

  return (
    <Shell className="space-y-10">
      <h1 className="text-3xl font-medium">{'Save your mnemonic phrase'}</h1>
      <p className="">{mnemonic}</p>
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
