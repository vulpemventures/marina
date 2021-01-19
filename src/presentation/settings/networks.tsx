import React, { useState } from 'react';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';

const SettingsNetworks: React.FC = () => {
  const networks = ['Liquid', 'Regtest'];
  const [selectedNetwork, setSelectedNetwork] = useState(networks[0]);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Networks"
    >
      <p className="font-regular my-8 text-base text-left">Select the network</p>
      <Select
        data={networks}
        selectedValue={selectedNetwork}
        setSelectedValue={setSelectedNetwork}
      />
    </ShellPopUp>
  );
};

export default SettingsNetworks;
