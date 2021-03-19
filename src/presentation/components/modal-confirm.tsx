import React from 'react';
import Button from './button';
import Modal from './modal';

interface Props {
  btnTextClose: string;
  btnTextConfirm: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => any;
  onConfirm: () => any;
  title: string;
}

const ModalConfirm: React.FC<Props> = ({
  btnTextClose = 'Cancel',
  btnTextConfirm = 'Ok',
  children,
  isOpen,
  onClose,
  onConfirm,
  title,
}) => {
  if (!isOpen) {
    return <></>;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div>
        <h2 className="mt-4 text-2xl">{title}</h2>
        <div className="py-5">{children}</div>
      </div>
      <div className="flex justify-between">
        <Button
          isOutline={true}
          onClick={() => onClose()}
          className="bg-secondary hover:bg-secondary-light"
          textBase={true}
        >
          {btnTextClose}
        </Button>
        <Button
          onClick={() => {
            onClose();
            onConfirm();
          }}
          textBase={true}
        >
          {btnTextConfirm}
        </Button>
      </div>
    </Modal>
  );
};

export default ModalConfirm;
