import type { NetworkString } from 'ldk';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { changeNetwork } from '../../application/redux/actions/app';
import { restoreTaskAction } from '../../application/redux/actions/task';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import type { AccountID } from '../../domain/account';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { formatNetwork } from '../utils';

const availableNetworks: NetworkString[] = ['liquid', 'testnet', 'regtest'];
const formattedNetworks = availableNetworks.map((n) => formatNetwork(n));

export interface SettingsNetworksProps {
  restorationLoading: boolean;
  allAccountsIDs: AccountID[];
  network: NetworkString;
  error?: string;
}

const SettingsNetworksView: React.FC<SettingsNetworksProps> = ({
  restorationLoading,
  error,
  allAccountsIDs,
  network,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(false);

  const setSelectedValue = async (net: string) => {
    setIsLoading(true);
    const newNetwork = net.toLowerCase();
    if (newNetwork !== network) {
      // switch the selected network
      await dispatch(changeNetwork(newNetwork as NetworkString));

      // start deep restorer for all the accounts (done in background)
      await Promise.all(allAccountsIDs.map(restoreTaskAction).map(dispatch));
    }
    setIsLoading(false);
  };

  return (
    <ShellPopUp
      btnDisabled={isLoading || restorationLoading}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Networks"
    >
      <p className="font-regular my-8 text-base text-left">Select the network</p>
      <Select
        disabled={isLoading || restorationLoading}
        list={formattedNetworks}
        selected={formatNetwork(network)}
        onSelect={setSelectedValue}
      />

      {(isLoading || restorationLoading) && <p className="m-2">{'loading'}...</p>}
      {error && <p className="m-2">{error}</p>}
    </ShellPopUp>
  );
};

export default SettingsNetworksView;
