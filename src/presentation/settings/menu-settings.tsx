import React from 'react';
import { useHistory } from 'react-router';
import ShellPopUp from '../components/shell-popup';
import {
  SETTINGS_CURRENCY_ROUTE,
  SETTINGS_EXPLORER_ROUTE,
  SETTINGS_NETWORKS_ROUTE,
} from '../routes/constants';

const SettingsMenuSettings: React.FC = () => {
  const history = useHistory();
  const handleChangeCurrency = () => history.push(SETTINGS_CURRENCY_ROUTE);
  const handleExplorer = () => history.push(SETTINGS_EXPLORER_ROUTE);
  const handleNetworks = () => history.push(SETTINGS_NETWORKS_ROUTE);

  return (
    <ShellPopUp className="h-popupContent" currentPage="Settings">
      <ul className="flex flex-col h-full">
        <button onClick={handleChangeCurrency}>
          <li className="settings-list-item border-t-0.5">
            <span className="font-regular text-base">Change Currency</span>
            <img className="w-5 h-5" src="assets/images/chevron-right.svg" alt="chevron" />
          </li>
        </button>

        <button onClick={handleExplorer}>
          <li className="settings-list-item">
            <span className="font-regular text-base">Explorer</span>
            <img className="w-5 h-5" src="assets/images/chevron-right.svg" alt="chevron" />
          </li>
        </button>

        <button onClick={handleNetworks}>
          <li className="settings-list-item">
            <span className="font-regular text-base">Networks</span>
            <img className="w-5 h-5" src="assets/images/chevron-right.svg" alt="chevron" />
          </li>
        </button>
      </ul>
    </ShellPopUp>
  );
};

export default SettingsMenuSettings;
