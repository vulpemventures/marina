import React from 'react';
import ShellPopUp from '../components/shell-popup';
import { useDispatch, useSelector } from 'react-redux';
import { Network } from '../../domain/network';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { RootReducerState } from '../../domain/common';
import { setExplorer } from '../../application/redux/actions/app';
import Select from '../components/select';
import {
  BlockstreamExplorerURLs,
  ExplorerType,
  ExplorerURLs,
  MempoolExplorerURLs,
  NigiriDefaultExplorerURLs,
} from '../../domain/app';
import { useHistory } from 'react-router';
import { SETTINGS_CUSTOM_EXPLORER_ROUTE } from '../routes/constants';

function explorerTypesForNetwork(network: Network): ExplorerType[] {
  switch (network) {
    case 'liquid':
      return ['Blockstream', 'Mempool', 'Custom'];
    case 'regtest':
      return ['Nigiri', 'Custom'];
    default:
      return explorerTypesForNetwork('liquid');
  }
}

const SettingsExplorer: React.FC = () => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const app = useSelector((state: RootReducerState) => state.app);
  const network = app.network;

  const handleChange = async (urls: ExplorerURLs) => {
    await dispatch(setExplorer(urls, network));
  };

  const onSelect = (newValue: string) => {
    switch (newValue) {
      case 'Blockstream':
        handleChange(BlockstreamExplorerURLs).catch(console.error);
        break;
      case 'Mempool':
        handleChange(MempoolExplorerURLs).catch(console.error);
        break;
      case 'Nigiri':
        handleChange(NigiriDefaultExplorerURLs).catch(console.error);
        break;
      case 'Custom':
        history.push(SETTINGS_CUSTOM_EXPLORER_ROUTE);
        break;
      default:
        console.error('Invalid explorer type');
    }
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Explorer"
    >
      <p className="font-sm mt-8 text-left">Select the explorer</p>
      <Select
        list={explorerTypesForNetwork(network)}
        selected={app.explorerByNetwork[network].type}
        onSelect={onSelect}
        disabled={false}
      />
    </ShellPopUp>
  );
};

export default SettingsExplorer;
