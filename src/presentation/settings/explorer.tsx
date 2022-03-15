import React, { useState } from 'react';
import ShellPopUp from '../components/shell-popup';
import { useDispatch, useSelector } from 'react-redux';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import type { RootReducerState } from '../../domain/common';
import { setExplorer } from '../../application/redux/actions/app';
import Select from '../components/select';
import type {
  ExplorerType,
  ExplorerURLs} from '../../domain/app';
import {
  BlockstreamExplorerURLs,
  MempoolExplorerURLs,
  NigiriDefaultExplorerURLs,
} from '../../domain/app';
import SettingsCustomExplorerForm from '../components/explorer-custom-form';
import type { NetworkString } from 'ldk';
import { appInitState } from '../../application/redux/reducers/app-reducer';

function explorerTypesForNetwork(network: NetworkString): ExplorerType[] {
  switch (network) {
    case 'liquid':
      return ['Blockstream', 'Mempool', 'Custom'];
    case 'regtest':
      return ['Nigiri', 'Custom'];
    case 'testnet':
      return ['Testnet', 'Custom'];
    default:
      return explorerTypesForNetwork('liquid');
  }
}

const SettingsExplorer: React.FC = () => {
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const [custom, setCustom] = useState(false);

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
      case 'Testnet':
        handleChange(BlockstreamExplorerURLs).catch(console.error);
        break;
      case 'Custom':
        setCustom(true);
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
      <p className="font-regular my-8 text-base text-left">Select the explorer</p>
      <Select
        onClick={() => setCustom(false)}
        list={explorerTypesForNetwork(network)}
        selected={
          app.explorerByNetwork[network]
            ? app.explorerByNetwork[network].type
            : appInitState.explorerByNetwork[network].type
        }
        onSelect={onSelect}
        disabled={false}
      />

      {custom && (
        <SettingsCustomExplorerForm
          onDone={() => setCustom(false)}
          dispatch={dispatch}
          network={network}
        />
      )}
    </ShellPopUp>
  );
};

export default SettingsExplorer;
