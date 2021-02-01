import React from 'react';

interface RevealMnemonicProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  className?: string;
}

const RevealMnemonic: React.FC<RevealMnemonicProps> = ({
  onClick,
  className,
}: RevealMnemonicProps) => {
  return (
    <button
      className={`${className} opacity-80 flex flex-col items-center justify-center mx-auto text-white bg-black rounded-md`}
      onClick={onClick}
    >
      <img className="w-12 h-12" src="assets/images/lock.svg" alt="lock" />
      <span>Reveal mnemonic phrase</span>
    </button>
  );
};

export default RevealMnemonic;
