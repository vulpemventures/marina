import React, { useRef, useState } from 'react';
import { debounce } from 'lodash';
import { decrypt } from '../../application/utils';
import ModalUnlock from '../components/modal-unlock';
import RevealMnemonic from '../components/reveal-mnemonic';
import ShellPopUp from '../components/shell-popup';
import { IWallet } from '../../domain/wallet';
import { match } from '../../domain/password-hash';
import { createPassword } from '../../domain/password';

export interface SettingsShowMnemonicProps {
  wallet: IWallet;
}

const SettingsShowMnemonicView: React.FC<SettingsShowMnemonicProps> = ({ wallet }) => {
  const [mnemonic, setMnemonic] = useState('');
  const [isModalUnlockOpen, showUnlockModal] = useState(true);
  const handleShowModal = () => showUnlockModal(true);
  const handleModalUnlockCancel = () => showUnlockModal(false);
  const handleShowMnemonic = (password: string) => {
    if (!match(password, wallet.passwordHash)) {
      throw new Error('Invalid password');
    }
    const mnemo = decrypt(wallet.encryptedMnemonic, createPassword(password));
    setMnemonic(mnemo);
    showUnlockModal(false);
  };

  const debouncedHandleShowMnemonic = useRef(
    debounce(handleShowMnemonic, 2000, { leading: true, trailing: false })
  ).current;

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
        handleUnlock={debouncedHandleShowMnemonic}
      />
    </ShellPopUp>
  );
};

export default SettingsShowMnemonicView;
