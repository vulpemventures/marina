import React, { useContext } from 'react';
import Button from '../../components/button';
import { useHistory, useLocation } from 'react-router-dom';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import Shell from '../../components/shell';
import MnemonicDnd from '../../components/mnemonic-dnd';
import { AppContext } from '../../../application/background_script';
import { onboardingComplete, verifyWallet } from '../../../application/store/actions';

interface LocationState {
  mnemonic: string;
}

const SeedConfirm: React.FC = () => {
  const history = useHistory();
  const [, dispatch] = useContext(AppContext);
  const { state } = useLocation<LocationState>();

  const onError = (err: Error) => console.log(err);
  const onSuccess = () =>
    dispatch(onboardingComplete(() => history.push(INITIALIZE_END_OF_FLOW_ROUTE), onError));
  const handleConfirm = () => dispatch(verifyWallet(onSuccess, onError));

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
