import React from 'react';

interface RevealMnemonicButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const RevealMnemonicButton: React.FC<RevealMnemonicButtonProps> = ({
  onClick,
}: RevealMnemonicButtonProps) => {
  return (
    <button
      className="opacity-80 flex flex-col items-center justify-center w-4/5 h-24 mx-auto text-white bg-black rounded-md"
      onClick={onClick}
    >
      <img className="w-12 h-12" src="assets/images/lock.svg" alt="lock" />
      <span>Reveal mnemonic phrase</span>
    </button>
  );
};

export default RevealMnemonicButton;
