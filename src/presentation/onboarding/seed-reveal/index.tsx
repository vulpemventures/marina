import React, { useContext } from 'react';
import * as bip39 from 'bip39';
import { useHistory, useLocation } from 'react-router-dom';
import { AppContext } from '../../../application/background_script';
import { createWallet } from '../../../application/store/actions';
import Button from '../../components/button';
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
  const [, dispatch] = useContext(AppContext);

  const handleRemindMe = () => {
    dispatch(
      createWallet(
        state.password,
        mnemonic,
        'regtest',
        () => history.push(INITIALIZE_END_OF_FLOW_ROUTE),
        (err: Error) => console.log(err)
      )
    );
  };

  const handleNext = () => {
    dispatch(
      createWallet(
        state.password,
        mnemonic,
        'regtest',
        () => history.push({ pathname: INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE, state: { mnemonic } }),
        (err: Error) => console.log(err)
      )
    );
  };

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
