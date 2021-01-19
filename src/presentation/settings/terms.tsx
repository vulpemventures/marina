import React from 'react';
import ShellPopUp from '../components/shell-popup';

const SettingsTerms: React.FC = () => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Terms of service"
    >
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Viverra cras aliquam pellentesque
        lectus amet.
      </p>
    </ShellPopUp>
  );
};

export default SettingsTerms;
