import React from 'react';
import { useHistory } from 'react-router';
import ShellPopUp from '../components/shell-popup';
import {
  SETTINGS_ABOUT_ROUTE,
  SETTINGS_CREDITS_ROUTE,
  SETTINGS_TERMS_ROUTE,
} from '../routes/constants';

const SettingsMenuInfo: React.FC = () => {
  const history = useHistory();
  const handleAbout = () => history.push(SETTINGS_ABOUT_ROUTE);
  const handleCredits = () => history.push(SETTINGS_CREDITS_ROUTE);
  const handleTerms = () => history.push(SETTINGS_TERMS_ROUTE);

  return (
    <ShellPopUp className="h-popupContent" currentPage="Info">
      <ul className="flex flex-col h-full">
        <button onClick={handleAbout}>
          <li className="settings-list-item border-t-0.5">
            <span className="font-regular text-base">About</span>
            <img className="w-5 h-5" src="assets/images/chevron-right.svg" alt="chevron" />
          </li>
        </button>

        <button onClick={handleCredits}>
          <li className="settings-list-item">
            <span className="font-regular text-base">Credits</span>
            <img className="w-5 h-5" src="assets/images/chevron-right.svg" alt="chevron" />
          </li>
        </button>

        <button onClick={handleTerms}>
          <li className="settings-list-item">
            <span className="font-regular text-base">Terms of Service</span>
            <img className="w-5 h-5" src="assets/images/chevron-right.svg" alt="chevron" />
          </li>
        </button>
      </ul>
    </ShellPopUp>
  );
};

export default SettingsMenuInfo;
