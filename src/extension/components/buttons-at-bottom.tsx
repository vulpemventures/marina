import React from 'react';

interface Props {
  children: React.ReactElement | React.ReactElement[];
}

const ButtonsAtBottom: React.FC<Props> = ({ children }: Props) => {
  let cN = 'bottom-14 right-0 container absolute flex ';
  cN += React.Children.count(children) > 1 ? 'justify-between' : 'justify-end';
  return <div className={cN}>{children}</div>;
};

export default ButtonsAtBottom;
