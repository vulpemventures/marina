import React from 'react';
import ModalConfirm from './modal-confirm';

interface ReminderSaveMnemonicModalProps {
  isOpen: boolean;
  handleClose: () => void;
  handleConfirm: () => void;
}

const ReminderSaveMnemonicModal: React.FC<ReminderSaveMnemonicModalProps> = ({
  isOpen,
  handleClose,
  handleConfirm,
}) => {
  return (
    <ModalConfirm
      btnTextClose="Cancel"
      btnTextConfirm="Yes, I got it"
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Have you saved the mnemonic?"
    >
      <p className="text-base text-left">
        Please be sure to store your mnemonic phrase before start receiving funds.
      </p>
      <p className="text-base text-left">If you loose, you will not be able to spend your funds!</p>
    </ModalConfirm>
  );
};

export default ReminderSaveMnemonicModal;
