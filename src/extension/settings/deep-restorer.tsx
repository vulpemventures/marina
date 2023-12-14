import React, { useEffect, useState } from 'react';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import { restoreMessage } from '../../domain/message';
import { useStorageContext } from '../context/storage-context';
import { useBackgroundPortContext } from '../context/background-port-context';

type GapLimit = 20 | 40 | 80 | 160;

const SettingsDeepRestorer: React.FC = () => {
  const { backgroundPort } = useBackgroundPortContext();
  const { appRepository, walletRepository, cache } = useStorageContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [gapLimit, setGapLimit] = useState<GapLimit>(20);

  useEffect(() => {
    return appRepository.restorerLoader.onChanged((isLoading) => {
      setIsLoading(isLoading);
    });
  }, []);

  const onClickRestore = async () => {
    setError('');
    try {
      if (!cache?.network) throw new Error('No network selected');

      const allAccounts = await walletRepository.getAccountDetails();
      const messages = Object.entries(allAccounts)
        .filter(([, details]) => details.accountNetworks.includes(cache.network))
        .map(([account]) => restoreMessage(account, cache.network, gapLimit));

      await Promise.all(messages.map((message) => backgroundPort.sendMessage(message)));
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
