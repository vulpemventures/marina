import React, { useState } from 'react';
import ShellPopUp from '../components/shell-popup';
import Select from '../components/select';

const SettingsCurrency: React.FC = () => {
  const currencies = ['Dollar - USD', 'Euro - EUR', 'British Pound - GBP'];
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Change currency"
    >
      <p className="font-regular my-8 text-base text-left">Choose the currency conversion</p>
      <Select
        list={currencies}
        selected={selectedCurrency}
        onSelect={setSelectedCurrency}
        disabled={false}
      />
      <br />
      <p className="font-regular my-8 text-sm text-left">
        Psst! It does not work yet! Coming soon...
      </p>
    </ShellPopUp>
  );
};

export default SettingsCurrency;
