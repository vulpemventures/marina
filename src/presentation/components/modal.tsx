import React from 'react';
import ButtonIcon from './button-icon';

interface Props {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => any;
}
const Modal: React.FC<Props> = ({ isOpen, onClose, children }) => {
  if (!isOpen) {
    return <></>;
  }

  return (
    <div className="bg-smokeLight fixed inset-0 z-50 flex">
      <div className="rounded-xl relative flex flex-col max-w-xs p-8 m-auto bg-white">
        <div>{children}</div>
        <span className="absolute top-0 right-0 p-2">
          <ButtonIcon onClick={() => onClose()}>
            <img src="assets/images/exit.svg" alt="exit" />
          </ButtonIcon>
        </span>
      </div>
    </div>
  );
};

export default Modal;
