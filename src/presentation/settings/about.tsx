import React from 'react';
import ShellPopUp from '../components/shell-popup';

const SettingsAbout: React.FC = () => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="About"
    >
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Viverra cras aliquam pellentesque
        lectus amet.
      </p>
    </ShellPopUp>
  );
};

export default SettingsAbout;
