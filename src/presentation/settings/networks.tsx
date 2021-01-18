import React from 'react';
import ShellPopUp from '../components/shell-popup';

const SettingsNetworks: React.FC = () => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Networks"
    >
      <p className="font-regular my-8 text-base text-left">Select the network</p>
      <select className="border-primary ring-primary focus:ring-primary focus:border-primary w-full border-2 rounded-md">
        <option>Liquid</option>
        <option>Regtest</option>
      </select>
    </ShellPopUp>
  );
};

export default SettingsNetworks;
