import React from 'react';
import ShellPopUp from '../components/shell-popup';

const SettingsShowMnemonic: React.FC = () => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Show mnemonic"
    >
      <p className="font-regular my-8 text-base text-left">
        Save your mnemonic phrase in a secure place
      </p>
      <div className="border-primary p-4 text-base font-medium text-left border-2 rounded-md">
        grass snow rock kitchen black big yellow hand fog tree green window
      </div>
    </ShellPopUp>
  );
};

export default SettingsShowMnemonic;
