import React from 'react';
import Button from '../../components/button';
import { useHistory, useLocation } from 'react-router-dom';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import Shell from '../../components/shell';
import MnemonicDnd from '../../components/mnemonic-dnd';

interface LocationState {
  password: string;
  mnemonic: string;
}

const SeedConfirm: React.FC = () => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();

  const handleConfirm = () => history.push({ pathname: INITIALIZE_END_OF_FLOW_ROUTE, state });

  const mnemonic: string[] = state.mnemonic.trim().split(' ');
  const mnemonicRandomized = [...mnemonic];
  // Defining function returning random value from i to N
  const getRandomValue = (i: number, N: number) => Math.floor(Math.random() * (N - i) + i);
  // Shuffle a pair of two elements at random position j
  mnemonicRandomized.forEach(
    (elem, i, arr, j = getRandomValue(i, arr.length)) => ([arr[i], arr[j]] = [arr[j], arr[i]])
  );

  return (
    <Shell className="space-y-10">
      <h1 className="text-3xl font-medium">{'Confirm your secret mnemonic phrase'}</h1>
      <p className="">
        {'Enter your secret twelve words of your mnemonic phrase to make sure it is correct'}
      </p>

      <MnemonicDnd mnemonic={state.mnemonic} />

      <div className="grid w-4/5 grid-cols-4 grid-rows-3 gap-2">
        {mnemonicRandomized.map((word, i) => {
          return (
            <Button className="text-grayDark" key={i} isOutline={true} roundedMd={true}>
              {word}
            </Button>
          );
        })}
      </div>
      <div className="space-x-20">
        <Button className="w-52" onClick={handleConfirm}>
          {'Confirm'}
        </Button>
      </div>
    </Shell>
  );
};

export default SeedConfirm;
