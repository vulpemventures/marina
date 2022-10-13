import React from 'react';

interface Props {
  children: React.ReactElement | React.ReactElement[];
}

const ButtonsAtBottom: React.FC<Props> = ({ children }: Props) => {
  return <div className="bottom-10 right-8 absolute flex justify-end gap-1">{children}</div>;
};

export default ButtonsAtBottom;
