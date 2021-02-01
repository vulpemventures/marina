import React, { useContext, useState } from 'react';
import Button from '../../components/button';
import { useHistory } from 'react-router-dom';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import Shell from '../../components/shell';
import { AppContext } from '../../../application/store/context';
import { setVerified } from '../../../application/store/actions/onboarding';

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

const NULL_ERROR = '';
const ERROR_MSG = 'Invalid mnemonic';

const SeedConfirm: React.FC = () => {
  const history = useHistory();
  const [{ onboarding }, dispatch] = useContext(AppContext);

  const mnemonic: string[] = onboarding.mnemonic.trim().split(' ');
  const mnemonicRandomized = shuffleMnemonic([...mnemonic]);

  const [wordsList, setWordsList] = useState(mnemonicRandomized);
  const [selected, setSelected] = useState([] as string[]);
  const [error, setError] = useState(NULL_ERROR);

  const handleConfirm = () => {
    if (selected.join(' ') === mnemonic.join(' ')) {
      dispatch(setVerified());
      history.push(INITIALIZE_END_OF_FLOW_ROUTE);
    }

    setError(ERROR_MSG);
    setSelected([]);
    setWordsList(mnemonicRandomized);
  };

  // select a word among wordsList
  const selectWord = (index: number) => {
    if (error !== NULL_ERROR) setError(NULL_ERROR);
    const word = wordsList[index];
    setSelected((selected) => [...selected, word]);
    setWordsList(drop(wordsList, index));
  };

  // delete words from selected array
  const deleteSelectedWord = (index: number) => {
    const word = selected[index];
    setWordsList((wordsList) => [...wordsList, word]);
    setSelected(drop(selected, index));
  };

  const getBorderColor = () => (error === NULL_ERROR ? 'primary' : 'red');

  return (
    <Shell className="space-y-5">
      <h1 className="text-3xl font-medium">{'Confirm your secret mnemonic phrase'}</h1>
      <p className="text-base">
        {'Enter your secret twelve words of your mnemonic phrase to make sure it is correct'}
      </p>

      <div
        className={`border-${getBorderColor()} h-44 grid w-4/5 grid-cols-4 grid-rows-3 gap-2 p-2 border-2 rounded-md shadow-md`}
      >
        {selected.map((word: string, i: number) => (
          <Button
            className="text-grayDark hover:-translate-y-1 transition duration-300 ease-in-out transform shadow-md"
            key={i}
            isOutline={true}
            roundedMd={true}
            onClick={() => deleteSelectedWord(i)}
          >
            {word}
          </Button>
        ))}
      </div>

      <div className="text-red h-5 m-2 font-medium">{error}</div>

      <div className="h-44 grid w-4/5 grid-cols-4 grid-rows-3 gap-2 p-3">
        {wordsList.map((word, i) => (
          <Button
            className="text-grayDark hover:-translate-y-1 transition duration-300 ease-in-out transform shadow-md"
            key={i}
            isOutline={true}
            roundedMd={true}
            onClick={() => selectWord(i)}
          >
            {word}
          </Button>
        ))}
      </div>

      <Button className="w-52 shadow-md" disabled={wordsList.length > 0} onClick={handleConfirm}>
        {'Confirm'}
      </Button>
    </Shell>
  );
};

export default SeedConfirm;
