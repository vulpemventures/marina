import React, { useEffect } from 'react';
import ShellPopUp from '../components/shell-popup';
import Select from '../components/select';
import type { ExplorerType } from '../../domain/explorer';
import {
  isBlockstreamWebExplorerURL,
  isMempoolWebExplorerURL,
  isNigiriWebExplorerURL,
  BlockstreamExplorerURLs,
  BlockstreamTestnetExplorerURLs,
  MempoolExplorerURLs,
  MempoolTestnetExplorerURLs,
  NigiriDefaultExplorerURLs,
} from '../../domain/explorer';
import type { NetworkString } from 'marina-provider';
import { useHistory } from 'react-router';
import { SETTINGS_EXPLORER_CUSTOM_ROUTE } from '../routes/constants';
import { useStorageContext } from '../context/storage-context';

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
  const { appRepository, cache } = useStorageContext();
  const history = useHistory();
  const [selected, setSelected] = React.useState<ExplorerType>();

  useEffect(() => {
    (async () => {
      const webExplorerURL = await appRepository.getWebExplorerURL();
      if (!webExplorerURL) return;
      if (isMempoolWebExplorerURL(webExplorerURL)) {
        setSelected('Mempool');
        return;
      }

      if (isBlockstreamWebExplorerURL(webExplorerURL)) {
        setSelected('Blockstream');
        return;
      }

      if (isNigiriWebExplorerURL(webExplorerURL)) {
        setSelected('Nigiri');
        return;
      }

      setSelected('Custom');
    })().catch(console.error);
  }, [selected]);

  const handleChange = async (explorer: ExplorerType) => {
    const network = await appRepository.getNetwork();
    if (!network) return;
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
      if (urls) {
        await appRepository.setWebExplorerURL(network, urls.webExplorerURL);
        await appRepository.setWebsocketExplorerURLs({ [network]: urls.websocketExplorerURL });
      }
    }
  };

  const pushToCustomForm = () => history.push(SETTINGS_EXPLORER_CUSTOM_ROUTE);

  const onSelect = async (newValue: string) => {
    switch (newValue) {
      case 'Custom':
        pushToCustomForm();
        break;
      case 'Nigiri':
      case 'Blockstream':
      case 'Mempool':
        setSelected(newValue);
        await handleChange(newValue);
        break;
    }
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Explorer"
    >
      <>
        <p className="font-regular my-8 text-base text-left">Select the explorer</p>
        {cache?.network && (
          <Select
            list={explorerTypesForNetwork(cache.network)}
            selected={selected || 'Custom'}
            onSelect={onSelect}
            disabled={false}
          />
        )}
      </>
    </ShellPopUp>
  );
};

export default SettingsExplorer;
