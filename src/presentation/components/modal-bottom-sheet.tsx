import React, { useRef } from 'react';
import ButtonIcon from './button-icon';
import useOnClickOutside from '../hooks/use-onclick-outside';

interface Props {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => any;
}

const ModalBottomSheet: React.FC<Props> = ({ isOpen, onClose, children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(ref, onClose);

  if (!isOpen) {
    return <></>;
  }

  return (
    <div className="fixed bottom-0 z-50 flex">
      <div
        className="rounded-t-lg min-h-60 p-8 m-auto bg-white flex flex-col"
        ref={ref}
      >
        <div className="flex flex-col flex-1 justify-between">{children}</div>
      </div>
    </div>
  );
};

export default ModalBottomSheet;
