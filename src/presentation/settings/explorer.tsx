import React from 'react';
import ShellPopUp from '../components/shell-popup';
import { useDispatch } from 'react-redux';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { setExplorer } from '../../application/redux/actions/app';
import Select from '../components/select';
import type { ExplorerType, ExplorerURLs } from '../../domain/app';
import {
  BlockstreamExplorerURLs,
  BlockstreamTestnetExplorerURLs,
  MempoolExplorerURLs,
  MempoolTestnetExplorerURLs,
  NigiriDefaultExplorerURLs,
} from '../../domain/app';
import type { NetworkString } from 'ldk';
import { appInitState } from '../../application/redux/reducers/app-reducer';
import { useHistory } from 'react-router';
import { SETTINGS_EXPLORER_CUSTOM_ROUTE } from '../routes/constants';
import Button from '../components/button';

export interface SettingsExplorerProps {
  currentExplorerURLs: ExplorerURLs;
  network: NetworkString;
}

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

const SettingsExplorerView: React.FC<SettingsExplorerProps> = ({
  currentExplorerURLs,
  network,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const history = useHistory();

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

  const pushToCustomForm = () => history.push(SETTINGS_EXPLORER_CUSTOM_ROUTE);

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
        pushToCustomForm();
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
        list={explorerTypesForNetwork(network)}
        selected={
          currentExplorerURLs
            ? currentExplorerURLs.type
            : appInitState.explorerByNetwork[network].type
        }
        onSelect={onSelect}
        disabled={false}
      />

      <div className="flex justify-end mt-1">
        <div>
          <Button type="button" onClick={() => pushToCustomForm()}>
            Use Custom
          </Button>
        </div>
      </div>
    </ShellPopUp>
  );
};

export default SettingsExplorerView;
