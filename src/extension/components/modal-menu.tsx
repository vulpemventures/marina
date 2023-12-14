import React, { useCallback, useRef } from 'react';
import { useHistory } from 'react-router';
import { stopServicesMessage } from '../../domain/message';
import useOnClickOutside from '../hooks/use-onclick-outside';
import {
  DEFAULT_ROUTE,
  SETTINGS_MENU_INFO_ROUTE,
  SETTINGS_MENU_SECURITY_ROUTE,
  SETTINGS_MENU_SETTINGS_ROUTE,
} from '../routes/constants';
import { useBackgroundPortContext } from '../context/background-port-context';
import { useStorageContext } from '../context/storage-context';

interface Props {
  isOpen: boolean;
  handleClose: () => any;
}

const ModalMenu: React.FC<Props> = ({ isOpen, handleClose }) => {
  const history = useHistory();
  const { appRepository } = useStorageContext();
  const { backgroundPort } = useBackgroundPortContext();

  const ref = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(ref, useCallback(handleClose, [ref, handleClose]));
  const handleSecurity = () => history.push(SETTINGS_MENU_SECURITY_ROUTE);
  const handleSettings = () => history.push(SETTINGS_MENU_SETTINGS_ROUTE);
  const handleInfo = () => history.push(SETTINGS_MENU_INFO_ROUTE);
  const handleLogOut = async () => {
    await appRepository.updateStatus({ isAuthenticated: false });
    await backgroundPort.sendMessage(stopServicesMessage());
    history.push(DEFAULT_ROUTE);
  };

  if (!isOpen) {
    return <></>;
  }

  return (
    <div className="bg-smokeLight fixed inset-0 z-50 flex pr-2">
      <div
        className="rounded-xl w-36 h-44 top-10 relative flex flex-col px-6 py-4 ml-auto bg-white"
        ref={ref}
      >
        <ul className="flex flex-col justify-between h-full">
          <button onClick={handleSecurity}>
            <li className="flex flex-row items-center gap-2">
              <img className="w-6 h-6" src="assets/images/shield-check.svg" alt="security" />
              <span className="font-regular text-sm">Security</span>
            </li>
          </button>

          <button onClick={handleSettings}>
            <li className="flex flex-row items-center gap-2">
              <img className="w-6 h-6" src="assets/images/cog.svg" alt="settings" />
              <span className="font-regular text-sm">Settings</span>
            </li>
          </button>

          <button onClick={handleInfo}>
            <li className="flex flex-row items-center gap-2">
              <img className="w-6 h-6" src="assets/images/information-circle.svg" alt="info" />
              <span className="font-regular text-sm">Info</span>
            </li>
          </button>

          <button onClick={handleLogOut}>
            <li className="flex flex-row items-center gap-2">
              <img className="w-6 h-6" src="assets/images/logout.svg" alt="logout" />
              <span className="font-regular text-sm">Log out</span>
            </li>
          </button>
        </ul>
      </div>
    </div>
  );
};

export default ModalMenu;
