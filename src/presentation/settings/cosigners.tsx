import React from 'react';
import ShellPopUp from '../components/shell-popup';
import browser from 'webextension-polyfill';
import { PAIR_COSIGNER_ROUTE } from '../routes/constants';
import { MultisigAccountData } from '../../domain/account';
import { CosignerExtraData } from '../../domain/wallet';
import ButtonList from '../components/button-list';
import Button from '../components/button';

export interface SettingsCosignersProps {
  multisigAccountsData: MultisigAccountData<CosignerExtraData>[];
}

const SettingsCosignersView: React.FC<SettingsCosignersProps> = ({ multisigAccountsData }) => {
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
      <div className="max-h-80">
        <ButtonList emptyText="" title="Cosigners">
          {multisigAccountsData.map(({ extraData }, index) => (
            <div
              key={`${extraData.cosignerURL}${index}`}
              className="hover:bg-blue-600 hover:text-blue-200 p-3 rounded-sm shadow-md"
            >
              <b>
                Cosigner #{index} <br />
              </b>
              {extraData.cosignerURL}
            </div>
          ))}
        </ButtonList>
      </div>

      <div className="hover:underline text-primary self-start justify-start font-bold align-bottom">
        <Button className="cursor-pointer" onClick={openAddCosignerTab}>
          Add cosigner
        </Button>
      </div>
    </ShellPopUp>
  );
};

export default SettingsCosignersView;
