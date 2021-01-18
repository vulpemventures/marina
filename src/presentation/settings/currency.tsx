import React from 'react';
import ShellPopUp from '../components/shell-popup';

const SettingsCurrency: React.FC = () => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Change currency"
    >
      <p className="font-regular my-8 text-base text-left">Choose the currency conversion</p>
      <select className="border-primary ring-primary focus:ring-primary focus:border-primary w-full border-2 rounded-md">
        <option>Euro - EUR</option>
        <option>Dollar - USD</option>
        <option>British Pound - GBP</option>
      </select>
    </ShellPopUp>
  );
};

export default SettingsCurrency;
