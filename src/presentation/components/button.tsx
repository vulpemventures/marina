import React from 'react';
import cx from 'classnames';

interface Props {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  isOutline?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, extraData: any) => void;
  roundedMd?: boolean;
  textBase?: boolean;
  type?: 'submit' | 'button' | 'reset';
  extraData?: any;
}

const Button: React.FC<Props> = ({
  type = 'button',
  children,
  onClick,
  className = '',
  disabled = false,
  isOutline = false,
  roundedMd = false,
  textBase = false,
  extraData = undefined,
}: Props) => {
  const classes = cx(
    'antialiased font-bold tracking-wider py-2 px-4 focus:outline-none focus:shadow-outline',
    className,
    { 'bg-primary text-white': !isOutline && !disabled },
    { 'bg-grayLight text-white': !isOutline && disabled },
    { 'text-primary bg-white shadow-innerBtnBorder': isOutline },
    { 'rounded-3xl': !roundedMd },
    { 'rounded-md': roundedMd },
    { 'text-lg': !textBase },
    { 'text-base': textBase }
  );

  return (
    <button
      className={classes}
      disabled={disabled}
      type={type}
      onClick={(e) => (onClick ? onClick(e, extraData) : {})}
      data-extra={extraData}
    >
      {children}
    </button>
  );
};

export default Button;
