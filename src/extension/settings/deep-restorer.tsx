import React, { useEffect, useState } from 'react';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import {
  appRepository,
  useSelectNetwork,
  walletRepository,
} from '../../infrastructure/storage/common';
import Browser from 'webextension-polyfill';
import { restoreMessage } from '../../domain/message';

type GapLimit = 20 | 40 | 80 | 160;

const SettingsDeepRestorer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [gapLimit, setGapLimit] = useState<GapLimit>(20);
  const network = useSelectNetwork();

  useEffect(() => {
    return appRepository.restorerLoader.onChanged((isLoading) => {
      setIsLoading(isLoading);
    });
  }, []);

  const onClickRestore = async () => {
    if (!network) return;
    setError('');
    try {
      const allAccounts = await walletRepository.getAccountDetails();
      const port = Browser.runtime.connect();
      const messages = Object.entries(allAccounts)
        .filter(([, details]) => details.accountNetworks.includes(network))
        .map(([account]) => restoreMessage(account, network, gapLimit));
      messages.forEach((message) => port.postMessage(message));
    } catch (e) {
      console.error(e);
      if (e instanceof Error) setError(e.message);
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
