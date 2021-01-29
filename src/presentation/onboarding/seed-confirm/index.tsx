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

  return words
}

function drop(words: string[], index: number): string[] {
  words.splice(index, 1)
  return words
}

const SeedConfirm: React.FC = () => {
  const history = useHistory();
  const [{ onboarding }, dispatch] = useContext(AppContext);

  const mnemonic: string[] = onboarding.mnemonic.trim().split(' ');
  const mnemonicRandomized = shuffleMnemonic([...mnemonic]);

  const [wordsList, setWordsList] = useState(mnemonicRandomized)
  const [selected, setSelected] = useState([] as string[])
  const [error, setError] = useState("")

  const handleConfirm = () => {
    if (selected.join(' ') === mnemonic.join(' ')) {
      dispatch(setVerified());
      history.push(INITIALIZE_END_OF_FLOW_ROUTE);
    }

    setError("Invalid mnemonic! please retry.")
    setSelected([])
    setWordsList(mnemonicRandomized)
  };

  // select a word among wordsList
  const selectWord = (index: number) => {
    const word = wordsList[index]
    setSelected(selected => [...selected, word])
    setWordsList(drop(wordsList, index))
  }

  // delete words from selected array
  const deleteSelectedWord = (index: number) => {
    const word = selected[index]
    setWordsList(wordsList => [...wordsList, word])
    setSelected(drop(selected, index))
  }

  return (
    <Shell className="space-y-10">
      <h1 className="text-3xl font-medium">{'Confirm your secret mnemonic phrase'}</h1>
      <p className="">
        {'Enter your secret twelve words of your mnemonic phrase to make sure it is correct'}
      </p>

      <div className="border-primary grid w-4/5 grid-cols-4 grid-rows-3 gap-2 p-2 border-2 rounded-md">
        {selected.map((word: string, i: number) => (
          <Button className="text-grayDark transition duration-500 ease-in-out transform hover:-translate-y-1" key={i} isOutline={true} roundedMd={true} onClick={() => deleteSelectedWord(i)}>
            {word}
          </Button>
        ))}
      </div>

      <div className="grid w-4/5 grid-cols-4 grid-rows-3 gap-2">
        {wordsList.map((word, i) => (
            <Button className="text-grayDark transition duration-500 ease-in-out transform hover:-translate-y-1" key={i} isOutline={true} roundedMd={true} onClick={() => selectWord(i)}>
              {word}
            </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 grid-rows-2 gap-2">
        <Button className="w-52" disabled={wordsList.length > 0} onClick={handleConfirm}>
          {'Confirm'}
        </Button>
        <p>
          {error}
        </p>
      </div>
    </Shell>
  );
};

export default SeedConfirm;
