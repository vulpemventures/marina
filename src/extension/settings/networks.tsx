import type { NetworkString } from 'marina-provider';
import { AccountType } from 'marina-provider';
import React, { useState } from 'react';
import { AccountFactory } from '../../domain/account';
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
        const factory = await AccountFactory.create(walletRepository);
        const allAccounts = await factory.makeAll(newNetwork);
        const chainSource = await appRepository.getChainSource(newNetwork);
        if (!chainSource) throw new Error('Chain source not found, cannot restore accounts');
        for (const account of allAccounts) {
          try {
            if ((await account.getAccountType()) !== AccountType.P2WPKH) continue; // only sync P2WPKH accounts
            await account.sync(chainSource, 20);
          } catch (e) {
            console.error(e);
          }
        }
        await chainSource.close();
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
