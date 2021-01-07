import React from 'react';

interface Props {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

const ButtonIcon: React.FC<Props> = ({ children, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`focus:outline-none focus:border-none hover:bg-grayLight hover:bg-opacity-10 rounded-md inline-flex items-center ${className}`}
    >
      {children}
    </button>
  );
};

export default ButtonIcon;
