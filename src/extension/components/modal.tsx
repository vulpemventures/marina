import React, { useRef } from 'react';
import ButtonIcon from './button-icon';
import useOnClickOutside from '../hooks/use-onclick-outside';
import classNames from 'classnames';

export interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => any;
  withoutMinHeight?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, withoutMinHeight = false }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(ref, onClose);

  if (!isOpen) {
    return <></>;
  }

  return (
    <div className="bg-smokeLight -top-16 fixed inset-0 z-50 flex">
      <div
        className={classNames(
          { 'min-h-80': !withoutMinHeight },
          'rounded-xl relative flex flex-col max-w-xs p-8 m-auto bg-white'
        )}
        ref={ref}
      >
        <div className="flex flex-col justify-between flex-1">{children}</div>
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
