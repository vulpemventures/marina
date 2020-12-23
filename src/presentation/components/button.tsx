import React from 'react';
import cx from 'classnames';

interface Props {
  children: React.ReactNode;
  type?: 'submit' | 'button' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  className?: string;
  isOutline?: boolean;
  roundedMd?: boolean;
}

const Button: React.FC<Props> = ({
  type = 'button',
  children,
  onClick,
  className = '',
  isOutline = false,
  roundedMd = false,
}: Props) => {
  const classes = cx(
    'font-medium tracking-wide py-2 px-4 focus:outline-none focus:shadow-outline',
    className,
    { 'bg-primary text-white': !isOutline },
    { 'border-primary border-2 text-primary': isOutline },
    { 'rounded-3xl': !roundedMd },
    { 'rounded-md': roundedMd }
  );

  return (
    <button className={classes} type={type} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
