import React from 'react';
import { EsploraIdentityRestorer, IdentityType, MasterPublicKey } from 'ldk';
import { useDispatch, useSelector } from 'react-redux';
import { changeNetwork } from '../../application/redux/actions/app';
import { UpdateTxs } from '../../application/redux/actions/transaction';
import { updateUtxos } from '../../application/redux/actions/utxos';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { explorerApiUrl } from '../../application/utils';
import { RootReducerState } from '../../domain/common';
import { Network } from '../../domain/network';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { formatNetwork } from '../utils';

const SettingsNetworks: React.FC = () => {
  const networks = ['liquid', 'regtest'];
  const formattedNetworks = networks.map((n) => formatNetwork(n));
  const network = useSelector((state: RootReducerState) => state.app.network);
  const wallet = useSelector((state: RootReducerState) => state.wallet);
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const selectedNetwork = formatNetwork(network);
  const setSelectedValue = async (net: Network) => {
    await dispatch(changeNetwork(net));
    const restorer = new EsploraIdentityRestorer(explorerApiUrl[net]);
    const pukKey = new MasterPublicKey({
      chain: network,
      restorer,
      type: IdentityType.MasterPublicKey,
      value: {
        masterPublicKey: wallet.masterXPub,
        masterBlindingKey: wallet.masterBlindingKey,
      },
      initializeFromRestorer: true,
    });

    await pukKey.isRestored;
    await dispatch(UpdateTxs()).catch(console.error);
    await dispatch(updateUtxos()).catch(console.error);
  };

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
