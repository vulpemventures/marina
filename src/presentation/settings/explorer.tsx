import React, { useState } from 'react';
import ShellPopUp from '../components/shell-popup';
import { useDispatch, useSelector } from 'react-redux';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import type { RootReducerState } from '../../domain/common';
import { setExplorer } from '../../application/redux/actions/app';
import Select from '../components/select';
import type { ExplorerType } from '../../domain/app';
import {
  BlockstreamExplorerURLs,
  BlockstreamTestnetExplorerURLs,
  MempoolExplorerURLs,
  MempoolTestnetExplorerURLs,
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
      return ['Blockstream', 'Mempool', 'Custom'];
    default:
      return explorerTypesForNetwork('liquid');
  }
}

const SettingsExplorer: React.FC = () => {
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const [custom, setCustom] = useState(false);

  const app = useSelector((state: RootReducerState) => state.app);
  const network = app.network;

  const handleChange = async (explorer: ExplorerType) => {
    let urls;
    if (explorerTypesForNetwork(network).includes(explorer)) {
      switch (network) {
        case 'liquid':
          if (explorer === 'Blockstream') urls = BlockstreamExplorerURLs;
          if (explorer === 'Mempool') urls = MempoolExplorerURLs;
          break;
        case 'testnet':
          if (explorer === 'Blockstream') urls = BlockstreamTestnetExplorerURLs;
          if (explorer === 'Mempool') urls = MempoolTestnetExplorerURLs;
          break;
        case 'regtest':
          if (explorer === 'Nigiri') urls = NigiriDefaultExplorerURLs;
          break;
        default:
      }
      if (urls) await dispatch(setExplorer(urls, network));
    }
  };

  const onSelect = (newValue: string) => {
    switch (newValue) {
      case 'Blockstream':
        handleChange('Blockstream').catch(console.error);
        break;
      case 'Mempool':
        handleChange('Mempool').catch(console.error);
        break;
      case 'Nigiri':
        handleChange('Nigiri').catch(console.error);
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
