import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { setDeepRestorerGapLimit } from '../../application/redux/actions/wallet';
import Button from '../components/button';
import type { AccountID } from '../../domain/account';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import Browser from 'webextension-polyfill';
import {
  forceUpdateMessage,
  isForceUpdateResponseMessage,
  isRestoreAccountTaskResponseMessage,
  restoreTaskMessage,
} from '../../domain/message';
import type { NetworkString } from 'ldk';

export interface DeepRestorerProps {
  allAccountsIDs: AccountID[];
  gapLimit: number;
  error?: string;
}

const SettingsDeepRestorerView: React.FC<DeepRestorerProps> = ({
  allAccountsIDs,
  error,
  gapLimit,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(false);

  const onClickRestore = () => {
    setIsLoading(true);
    const port = Browser.runtime.connect();

    port.onMessage.addListener((msg, port) => {
      if (isRestoreAccountTaskResponseMessage(msg)) {
        if (!msg.success) console.error(msg.error);
        port.postMessage(forceUpdateMessage(msg.accountID, msg.network));
      }

      if (isForceUpdateResponseMessage(msg)) {
        if (!msg.success) console.error(msg.error);
        setIsLoading(false);
      }
    });

    for (const ID of allAccountsIDs) {
      for (const net of ['liquid', 'testnet', 'regtest'] as NetworkString[]) {
        port.postMessage(restoreTaskMessage(ID, net));
      }
    }
  };

  return (
    <ShellPopUp
      btnDisabled={isLoading}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Deep restorer"
    >
      <p className="font-regular my-8 text-base text-left">Select the restoration gap limit</p>
      <Select
        disabled={isLoading}
        list={['20', '40', '80', '160']}
        selected={gapLimit.toString(10)}
        onSelect={(selectedGapLimit: string) => {
          if (isLoading) return;
          dispatch(setDeepRestorerGapLimit(parseInt(selectedGapLimit))).catch(console.error);
        }}
      />
      {isLoading && <p className="m-2">{'restoration loading'}...</p>}
      {error && <p className="m-2">{error}</p>}
      <ButtonsAtBottom>
        <Button disabled={isLoading} onClick={onClickRestore} type="submit">
          Restore
        </Button>
      </ButtonsAtBottom>
    </ShellPopUp>
  );
};

export default SettingsDeepRestorerView;
