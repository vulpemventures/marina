import React, { useContext, useState } from 'react';
import { useHistory } from 'react-router';
import { AppContext } from '../../application/background_script';
import ModalUnlock from '../components/modal-unlock';
import ShellPopUp from '../components/shell-popup';
import { SETTINGS_CHANGE_PASSWORD_ROUTE, SETTINGS_SHOW_MNEMONIC_ROUTE } from '../routes/constants';

const SettingsMenuSecurity: React.FC = () => {
  const history = useHistory();
  const handleChangePassword = () => history.push(SETTINGS_CHANGE_PASSWORD_ROUTE);
  // Show mnemonic
  const [, dispatch] = useContext(AppContext);
  const [isModalUnlockOpen, showUnlockModal] = useState(false);
  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleShowMnemonic = () => {
    showUnlockModal(true);
    // If password is valid set isWalletUnlocked state to true
    // Push if isWalletUnlocked is true
    //history.push(SETTINGS_SHOW_MNEMONIC_ROUTE);
  };

  return (
    <ShellPopUp className="h-popupContent" currentPage="Security">
      <ul className="flex flex-col h-full">
        <button onClick={handleShowMnemonic}>
          <li className="settings-list-item border-t-0.5">
            <span className="font-regular text-base">Show Mnemonic</span>
            <img className="w-5 h-5" src="assets/images/chevron-right.svg" alt="chevron" />
          </li>
        </button>

        <button onClick={handleChangePassword}>
          <li className="settings-list-item">
            <span className="font-regular text-base">Change Password</span>
            <img className="w-5 h-5" src="assets/images/chevron-right.svg" alt="chevron" />
          </li>
        </button>
      </ul>

      <ModalUnlock
        dispatch={dispatch}
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
      />
    </ShellPopUp>
  );
};

export default SettingsMenuSecurity;
