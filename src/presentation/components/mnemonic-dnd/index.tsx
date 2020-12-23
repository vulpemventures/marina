import React, { useContext } from 'react';
import { AppContext } from '../../../application/background_script';
import Button from '../button';

/**
 * Mnemonic presented in a grid
 *
 * TODO: Add drag&drop functionality to rearrange the order of the words
 */
const MnemonicDnd: React.FC = () => {
  const appCtx = useContext(AppContext);
  const mnemonic = appCtx?.[0]?.wallets?.[0]?.mnemonic;

  return (
    <div className="border-primary grid w-4/5 grid-cols-4 grid-rows-3 gap-2 p-2 border-2 rounded-md">
      {mnemonic.map((word: string, i: number) => (
        <Button className="text-grayDark" key={i} isOutline={true} roundedMd={true}>
          {word}
        </Button>
      ))}
    </div>
  );
};

export default MnemonicDnd;
