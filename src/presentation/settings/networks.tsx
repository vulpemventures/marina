import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changeNetwork } from '../../application/redux/actions/app';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { RootReducerState } from '../../domain/common';
import { createNetwork, Network } from '../../domain/network';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { formatNetwork } from '../utils';

const SettingsNetworks: React.FC = () => {
  const networks = ['liquid', 'regtest'];
  const formattedNetworks = networks.map((n) => formatNetwork(n));
  const network = useSelector((state: RootReducerState) => state.app.network);
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const selectedNetwork = formatNetwork(network);
  const setSelectedValue = (net: Network) =>
    dispatch(changeNetwork(createNetwork(net.toLowerCase())));

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Networks"
    >
      <p className="font-regular my-8 text-base text-left">Select the network</p>
      <Select
        data={formattedNetworks}
        selectedValue={selectedNetwork}
        setSelectedValue={setSelectedValue}
      />
    </ShellPopUp>
  );
};

export default SettingsNetworks;
