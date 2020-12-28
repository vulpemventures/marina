import React, { useContext } from 'react';
import { AppContext } from '../../../application/background_script';
import Button from '../../components/button';
import Shell from '../../components/shell';
import * as ACTIONS from '../../../application/store/actions/action-types';

const EndOfFlow: React.FC = () => {
  const [, dispatch] = useContext(AppContext);
  const handleClick = () => dispatch([ACTIONS.ONBOARDING_COMPLETETED]);

  return (
    <Shell className="space-y-10" hasBackBtn={false}>
      <h1 className="text-5xl">{'🎉 😃 Congratulations !'}</h1>
      <p>{'You have just created a new wallet'}</p>
      <Button onClick={handleClick}>{'Done'}</Button>
    </Shell>
  );
};

export default EndOfFlow;
