import type { NetworkString } from 'marina-provider';
import React, { useState } from 'react';
import { useStorageContext } from '../context/storage-context';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { formatNetwork } from '../utility';
import { restoreMessage } from '../../domain/message';
import { useBackgroundPortContext } from '../context/background-port-context';

const availableNetworks: NetworkString[] = ['liquid', 'testnet', 'regtest'];
const formattedNetworks = availableNetworks.map((n) => formatNetwork(n));

const SettingsNetworksView: React.FC = () => {
  const { appRepository, walletRepository, cache } = useStorageContext();
  const { backgroundPort } = useBackgroundPortContext();
  const [isLoading, setIsLoading] = useState(false);

  const setSelectedValue = async (net: string) => {
    setIsLoading(true);
    try {
      const newNetwork = net.toLowerCase() as NetworkString;
      if (newNetwork === cache?.network) throw new Error('Network already selected');
      // switch the selected network
      await appRepository.setNetwork(newNetwork);
      const allAccounts = await walletRepository.getAccountDetails();
      const messages = Object.entries(allAccounts)
        .filter(([, details]) => details.accountNetworks.includes(newNetwork))
        .map(([account]) => restoreMessage(account, newNetwork, 20));
      await Promise.all(messages.map((message) => backgroundPort.sendMessage(message)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ShellPopUp
      btnDisabled={isLoading}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Networks"
    >
      <p className="font-regular my-8 text-base text-left">Select the network</p>
      {cache?.network && (
        <Select
          disabled={isLoading}
          list={formattedNetworks}
          selected={formatNetwork(cache.network)}
          onSelect={setSelectedValue}
        />
      )}

      {isLoading && <p className="m-2">{'loading'}...</p>}
    </ShellPopUp>
  );
};

export default SettingsNetworksView;
