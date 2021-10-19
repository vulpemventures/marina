import React from 'react';
import ShellPopUp from '../components/shell-popup';
import browser from 'webextension-polyfill';
import { PAIR_COSIGNER_ROUTE } from '../routes/constants';
import { MultisigAccountData } from '../../domain/account';
import { CosignerExtraData } from '../../domain/wallet';

export interface SettingsCosignersProps {
  multisigAccountsData: MultisigAccountData<CosignerExtraData>[];
}

const SettingsCosigners: React.FC<SettingsCosignersProps> = ({ multisigAccountsData }) => {
  const openAddCosignerTab = async () => {
    const url = browser.runtime.getURL(`home.html#${PAIR_COSIGNER_ROUTE}`);
    await browser.tabs.create({ url });
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Change currency"
    >
      <p className="font-regular my-8 text-base text-left">Cosigners</p>
      <div className="bg-white rounded-lg shadow lg:w-1/3">
        <ul className="divide-y divide-gray-100">
        {multisigAccountsData.map(({ extraData }) =>
          <li className="p-3 hover:bg-blue-600 hover:text-blue-200">
            { extraData.cosignerURL }
          </li>
        )}  
        </ul>
      </div> 
          
      <div className="hover:underline text-primary self-start justify-start font-bold align-bottom">
        <span className="cursor-pointer" onClick={openAddCosignerTab}>
          Add cosigner
        </span>
      </div>
    </ShellPopUp>
  );
};

export default SettingsCosigners;
