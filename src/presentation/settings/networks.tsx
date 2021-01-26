import React, { useContext } from 'react';
import { AppContext } from '../../application/store/context';
import { changeNetwork } from '../../application/store/actions';
import { Network } from '../../domain/app/value-objects/network';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { formatNetwork } from '../utils';

const SettingsNetworks: React.FC = () => {
  const networks = ['liquid', 'regtest'];
  const formattedNetworks = networks.map((n) => formatNetwork(n));
  const [
    {
      app: { network },
    },
    dispatch,
  ] = useContext(AppContext);
  const selectedNetwork = formatNetwork(network.value);
  const setSelectedValue = (net: string) =>
    dispatch(
      changeNetwork(
        Network.create(net.toLowerCase()),
        () => ({}),
        (err: Error) => console.log(err)
      )
    );

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
