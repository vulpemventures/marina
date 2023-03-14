import React, { useState } from 'react';
import { decrypt } from '../../domain/encryption';
import ModalUnlock from '../components/modal-unlock';
import { useStorageContext } from '../context/storage-context';
import RevealMnemonic from '../components/reveal-mnemonic';
import ShellPopUp from '../components/shell-popup';

const SettingsShowMnemonic: React.FC = () => {
  const { walletRepository } = useStorageContext();
  const [mnemonic, setMnemonic] = useState('');
  const [isModalUnlockOpen, showUnlockModal] = useState(true);
  const handleShowModal = () => showUnlockModal(true);
  const handleModalUnlockCancel = () => showUnlockModal(false);

  const handleShowMnemonic = async (password: string) => {
    const encryptedMnemonic = await walletRepository.getEncryptedMnemonic();
    if (!encryptedMnemonic) {
      throw new Error('No encrypted mnemonic');
    }
    const mnemo = await decrypt(encryptedMnemonic, password);
    setMnemonic(mnemo);
    showUnlockModal(false);
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
