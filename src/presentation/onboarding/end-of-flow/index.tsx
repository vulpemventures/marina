import React, { useContext } from 'react';
import { AppContext } from '../../../application/background_script';
import Button from '../../components/button';
import Shell from '../../components/shell';
import * as ACTIONS from '../../../application/store/actions/action-types';

const EndOfFlow: React.FC = () => {
  const [, dispatch] = useContext(AppContext);
  const handleClick = () => dispatch([ACTIONS.ONBOARDING_COMPLETETED]);

  return (
    <Shell hasBackBtn={false}>
      <h1 className="text-5xl">Congratulations !</h1>
      <p className="mt-4">You have just created a new wallet</p>
      <img className="w-72 mb-14 mt-10" src="/assets/images/mermaid.png" alt="mermaid" />
      <Button onClick={handleClick}>Done</Button>
    </Shell>
  );
};

export default EndOfFlow;
