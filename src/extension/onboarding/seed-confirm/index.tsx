import React, { useEffect, useState } from 'react';
import cx from 'classnames';
import Button from '../../components/button';
import { useHistory } from 'react-router-dom';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import Shell from '../../components/shell';
import { INVALID_MNEMONIC_ERROR } from '../../../constants';
import {
  appRepository,
  useSelectIsFromPopupFlow,
  useSelectOnboardingMnemonic,
} from '../../../infrastructure/storage/common';

const NULL_ERROR = '';

const SeedConfirm: React.FC = () => {
  const history = useHistory();
  const isFromPopupFlow = useSelectIsFromPopupFlow();
  const onboardingMnemonic = useSelectOnboardingMnemonic();
  const [mnemonicRandomized, setMnemonicRandomized] = useState<string[]>([]);

  const shuffle = () => {
    if (!onboardingMnemonic) return;
    const mnemonic = onboardingMnemonic.trim().split(' ');
    const mnemonicRandomized = shuffleMnemonic([...mnemonic]);
    setMnemonicRandomized(mnemonicRandomized);
  };

  useEffect(() => {
    if (!onboardingMnemonic) return;
    shuffle();
  }, [onboardingMnemonic]);

  const [selected, setSelected] = useState([] as string[]);
  const [error, setError] = useState(NULL_ERROR);

  const handleConfirm = async () => {
    if (selected.join(' ') === onboardingMnemonic) {
      await appRepository.updateStatus({ isMnemonicVerified: true });
      history.push(INITIALIZE_END_OF_FLOW_ROUTE);
    }

    setError(INVALID_MNEMONIC_ERROR);
    setSelected([]);
  };

  // select a word among wordsList
  const selectWord = (index: number) => {
    if (error !== NULL_ERROR) setError(NULL_ERROR);
    const word = mnemonicRandomized[index];
    setSelected((selected) => [...selected, word]);
    setMnemonicRandomized(drop(mnemonicRandomized, index));
  };

  // delete words from selected array
  const deleteSelectedWord = (index: number) => {
    const word = selected[index];
    setMnemonicRandomized((wordsList) => [...wordsList, word]);
    setSelected(drop(selected, index));
  };

  return (
    <Shell className="space-y-5" hasBackBtn={!isFromPopupFlow}>
      <h1 className="text-3xl font-medium">{'Confirm your secret mnemonic phrase'}</h1>
      <p className="text-base">
        {'Enter your secret twelve words of your mnemonic phrase to make sure it is correct'}
      </p>

      <div
        className={cx(
          'h-44 grid w-4/5 grid-cols-3 grid-rows-4 gap-2 p-2 border-2 rounded-md shadow-md',
          {
            'border-primary': error === NULL_ERROR,
            'border-red': error !== NULL_ERROR,
          }
        )}
      >
        {selected.map((word: string, i: number) => (
          <Button
            className="text-grayDark hover:-translate-y-1 inline-flex items-center transition duration-300 ease-in-out transform shadow-md"
            key={i}
            isOutline={true}
            roundedMd={true}
            isTextSmall={true}
            onClick={() => deleteSelectedWord(i)}
          >
            {word}
          </Button>
        ))}
      </div>

      <div className="text-red h-5 m-2 font-medium">{error}</div>

      <div className="h-44 grid w-4/5 grid-cols-3 grid-rows-4 gap-2 p-3">
        {mnemonicRandomized.map((word, i) => (
          <Button
            className="text-grayDark hover:-translate-y-1 inline-flex items-center transition duration-300 ease-in-out transform shadow-md"
            key={i}
            isOutline={true}
            roundedMd={true}
            isTextSmall={true}
            onClick={() => selectWord(i)}
          >
            {word}
          </Button>
        ))}
      </div>

      <Button className="w-52" disabled={mnemonicRandomized.length > 0} onClick={handleConfirm}>
        {'Confirm'}
      </Button>
    </Shell>
  );
};

function shuffleMnemonic(words: string[]): string[] {
  // Defining function returning random value from i to N
  const getRandomValue = (i: number, N: number) => Math.floor(Math.random() * (N - i) + i);
  // Shuffle a pair of two elements at random position j
  words.forEach(
    (_, i, arr, j = getRandomValue(i, arr.length)) => ([arr[i], arr[j]] = [arr[j], arr[i]])
  );

  return words;
}

function drop(words: string[], index: number): string[] {
  words.splice(index, 1);
  return words;
}

export default SeedConfirm;
