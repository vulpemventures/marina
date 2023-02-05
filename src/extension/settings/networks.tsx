import type { NetworkString } from 'marina-provider';
import React, { useState } from 'react';
import Browser from 'webextension-polyfill';
import { AccountFactory } from '../../domain/account';
import { subscribeMessage } from '../../domain/message';
import {
  appRepository,
  useSelectNetwork,
  walletRepository,
} from '../../infrastructure/storage/common';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { formatNetwork } from '../utility';

const availableNetworks: NetworkString[] = ['liquid', 'testnet', 'regtest'];
const formattedNetworks = availableNetworks.map((n) => formatNetwork(n));

const SettingsNetworksView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const network = useSelectNetwork();

  const setSelectedValue = async (net: string) => {
    setIsLoading(true);
    try {
      const newNetwork = net.toLowerCase() as NetworkString;
      if (newNetwork !== network) {
        // switch the selected network
        await appRepository.setNetwork(newNetwork);
        const factory = await AccountFactory.create(walletRepository, appRepository, [newNetwork]);
        const port = Browser.runtime.connect();
        const allAccounts = await walletRepository.getAccountDetails();
        for (const name of Object.keys(allAccounts)) {
          try {
            const account = await factory.make(newNetwork, name);
            await account.sync();
            port.postMessage(subscribeMessage(account.name));
          } catch (e) {
            console.error(e);
          }
        }
      }
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
      {network && (
        <Select
          disabled={isLoading}
          list={formattedNetworks}
          selected={formatNetwork(network)}
          onSelect={setSelectedValue}
        />
      )}

      {isLoading && <p className="m-2">{'loading'}...</p>}
    </ShellPopUp>
  );
};

export default SettingsNetworksView;
