import React, { useState } from 'react';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import {
  appRepository,
  useSelectNetwork,
  walletRepository,
} from '../../infrastructure/storage/common';
import { AccountFactory } from '../../domain/account';
import { AccountType } from 'marina-provider';

type GapLimit = 20 | 40 | 80 | 160;

const SettingsDeepRestorer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [gapLimit, setGapLimit] = useState<GapLimit>(20);
  const network = useSelectNetwork();

  const onClickRestore = async () => {
    if (!network) return;
    setIsLoading(true);
    setError('');
    try {
      const accountsDetails = await walletRepository.getAccountDetails();
      const factory = await AccountFactory.create(walletRepository, appRepository, [network]);
      for (const [accountName, details] of Object.entries(accountsDetails)) {
        if (!details.accountNetworks.includes(network)) continue;
        if (details.type !== AccountType.P2WPKH) continue; // only P2WPKH are restorable
        const account = await factory.make(network, accountName);
        await account.sync(gapLimit, { internal: 0, external: 0 }); // force restore from 0
      }
    } catch (e) {
      console.error(e);
      if (e instanceof Error) setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ShellPopUp
      btnDisabled={isLoading}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Deep restorer"
    >
      <p className="font-regular my-8 text-base text-left">Select the restoration gap limit</p>
      <Select
        disabled={isLoading}
        list={['20', '40', '80', '160']}
        selected={gapLimit.toString(10)}
        onSelect={(selectedGapLimit: string) => {
          if (isLoading) return;
          setGapLimit(parseInt(selectedGapLimit, 10) as GapLimit);
        }}
      />
      {isLoading && <p className="m-2">{'restoration loading'}...</p>}
      {error && <p className="m-2">{error}</p>}
      <ButtonsAtBottom>
        <Button disabled={isLoading} onClick={onClickRestore} type="submit">
          Restore
        </Button>
      </ButtonsAtBottom>
    </ShellPopUp>
  );
};

export default SettingsDeepRestorer;
