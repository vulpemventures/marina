import React from 'react';
import Button from '../../components/button';
import { useHistory } from 'react-router-dom';
import {
  INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
} from '../routes/constants';
import Shell from '../../components/shell';

const SeedReveal: React.FC = () => {
  const history = useHistory();
  const handleRemindMe = () => history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  const handleNext = () => history.push(INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE);

  return (
    <Shell className="space-y-10">
      <h1 className="text-3xl font-medium">{'Save your mnemonic phrase'}</h1>
      <p className="">
        {
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse vitae proin maecenas sit nisi odio sed viverra.'
        }
      </p>
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
