import React from 'react';
import ModalConfirm from './modal-confirm';

interface SaveMnemonicModalProps {
  isOpen: boolean;
  handleClose: () => void;
  handleConfirm: () => void;
}

const SaveMnemonicModal: React.FC<SaveMnemonicModalProps> = ({
  isOpen,
  handleClose,
  handleConfirm,
}) => {
  return (
    <ModalConfirm
      btnTextClose="Cancel"
      btnTextConfirm="Save"
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Save your mnemonic"
    >
      <p className="text-base text-left">Save your mnemonic phrase to receive or send funds</p>
    </ModalConfirm>
  );
};

export default SaveMnemonicModal;
