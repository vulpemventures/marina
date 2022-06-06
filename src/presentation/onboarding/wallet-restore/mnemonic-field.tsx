import React, { useState } from 'react';
import cx from 'classnames';

interface Props {
  value: string;
  onChange: (mnemonic: string) => void;
}

export const MnemonicField: React.FC<Props> = ({ onChange, value }) => {
  const [error, setError] = useState<string>();

  const validSeed = (seed = ''): boolean => {
    const length = seed.trim().split(' ').length;
    return length === 12 || length === 24;
  }

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!validSeed(event.target.value)) {
      setError('Mnemonic is not valid - should be 12 or 24 words separated by spaces');
      onChange('');
    } else {
      setError(undefined);
      onChange(event.target.value);
    }
  };

  return (
    <>
      <textarea
        id="mnemonic"
        name="mnemonic"
        rows={5}
        className={cx(
          'border-2 focus:ring-primary focus:border-primary sm:text-sm placeholder-grayLight block w-3/5 rounded-md shadow-sm',
          {
            'border-red': error,
            'border-grayLight': !error,
          }
        )}
        onChange={handleChange}
        placeholder="Enter your mnemonic phrase"
        value={value}
      />
      {error && <p className="text-red h-10 mt-2 text-xs">{error}</p>}
    </>
  );
};
