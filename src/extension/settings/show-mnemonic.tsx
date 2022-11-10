import React, { useState } from 'react';
import { INVALID_PASSWORD_ERROR } from '../../constants';
import { walletRepository } from '../../infrastructure/storage/common';
import { decrypt, match } from '../../utils';
import ModalUnlock from '../components/modal-unlock';
import RevealMnemonic from '../components/reveal-mnemonic';
import ShellPopUp from '../components/shell-popup';

const SettingsShowMnemonic: React.FC = () => {
  const [mnemonic, setMnemonic] = useState('');
  const [isModalUnlockOpen, showUnlockModal] = useState(true);
  const handleShowModal = () => showUnlockModal(true);
  const handleModalUnlockCancel = () => showUnlockModal(false);

  const handleShowMnemonic = async (password: string) => {
    const passwordHash = await walletRepository.getPasswordHash();
    const encryptedMnemonic = await walletRepository.getEncryptedMnemonic();
    if (!passwordHash || !encryptedMnemonic) {
      throw new Error('No password or mnemonic');
    }
    if (!match(password, passwordHash)) {
      throw new Error(INVALID_PASSWORD_ERROR);
    }
    const mnemo = decrypt(encryptedMnemonic, password);
    setMnemonic(mnemo);
    showUnlockModal(false);
    return Promise.resolve();
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Show mnemonic"
    >
      <p className="font-regular my-8 text-base text-left">
        Save your mnemonic phrase in a secure place
      </p>
      {mnemonic ? (
        <div className="border-primary p-4 text-base font-medium text-left border-2 rounded-md">
          {mnemonic}
        </div>
      ) : (
        <RevealMnemonic className="w-4/5 h-24" onClick={handleShowModal} />
      )}

      <ModalUnlock
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockCancel}
        handleUnlock={handleShowMnemonic}
      />
    </ShellPopUp>
  );
};

export default SettingsShowMnemonic;
