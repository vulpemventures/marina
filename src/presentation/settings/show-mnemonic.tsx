import React, { useContext, useState } from 'react';
import { AppContext } from '../../application/store/context';
import { decrypt } from '../../application/utils/crypto';
import { Password } from '../../domain/wallet/value-objects';
import ModalUnlock from '../components/modal-unlock';
import ShellPopUp from '../components/shell-popup';

const SettingsShowMnemonic: React.FC = () => {
  const [mnemonic, setMnemonic] = useState('');
  const [{ wallets }] = useContext(AppContext);
  const [isModalUnlockOpen, showUnlockModal] = useState(true);
  const handleShowModal = () => showUnlockModal(true);
  const handleModalUnlockCancel = () => showUnlockModal(false);
  const handleShowMnemonic = (password: string) => {
    const mnemo = decrypt(wallets[0].encryptedMnemonic, Password.create(password)).value;
    setMnemonic(mnemo);
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
        <button
          className="opacity-80 flex flex-col items-center justify-center w-4/5 h-24 mx-auto text-white bg-black rounded-md"
          onClick={handleShowModal}
        >
          <img className="w-12 h-12" src="assets/images/lock.svg" alt="lock" />
          <span>Reveal mnemonic phrase</span>
        </button>
      )}

      <ModalUnlock
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockCancel}
        handleShowMnemonic={handleShowMnemonic}
      />
    </ShellPopUp>
  );
};

export default SettingsShowMnemonic;
