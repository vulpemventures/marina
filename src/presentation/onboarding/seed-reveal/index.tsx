import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Button from '../../components/button';
import {
  INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
} from '../../routes/constants';
import Shell from '../../components/shell';
import RevealMnemonic from '../../components/reveal-mnemonic';

export interface SeedRevealProps {
  onboardingMnemonic: string;
  isFromPopupFlow: boolean;
}

const SeedRevealView: React.FC<SeedRevealProps> = ({ onboardingMnemonic, isFromPopupFlow }) => {
  const history = useHistory();
  const [revealed, setRevealed] = useState(false);

  const handleRemindMe = () => history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  const handleNext = () => history.push(INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE);
  const handleClickReveal = () => setRevealed(true);

  return (
    <Shell hasBackBtn={!isFromPopupFlow}>
      <div className="flex flex-col content-start justify-start space-y-10">
        <h1 className="text-3xl font-medium">Save your mnemonic phrase</h1>
        <div className="max-w-prose w-96 flex flex-col justify-center h-32">
          {revealed ? (
            <div className="border-primary p-4 text-base font-medium text-left border-2 rounded-md shadow-md">
              {onboardingMnemonic || 'Loading...'}
            </div>
          ) : (
            <RevealMnemonic className="w-96 h-32 shadow-md" onClick={handleClickReveal} />
          )}
        </div>
        <div className="flex flex-wrap">
          {!isFromPopupFlow && (
            <Button className="w-52 mr-5" onClick={handleRemindMe} isOutline={true}>
              Remind me later
            </Button>
          )}
          <Button className="w-36" onClick={handleNext}>
            Next
          </Button>
        </div>
      </div>
    </Shell>
  );
};

export default SeedRevealView;
