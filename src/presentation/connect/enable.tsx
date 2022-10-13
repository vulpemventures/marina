import React, { useRef } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import type { WithConnectDataProps } from '../../application/redux/containers/with-connect-data.container';
import { connectWithConnectData } from '../../application/redux/containers/with-connect-data.container';
import { useDispatch, useSelector } from 'react-redux';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { enableWebsite, flushSelectedHostname } from '../../application/redux/actions/connect';
import type { RootReducerState } from '../../domain/common';
import { debounce } from 'lodash';
import PopupWindowProxy from './popupWindowProxy';
import ButtonsAtBottom from '../components/buttons-at-bottom';

const permissions = ['View confidential addresses of your wallet', 'View balances of your wallet'];

const ConnectEnableView: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const network = useSelector((state: RootReducerState) => state.app.network);
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const popupWindowProxy = new PopupWindowProxy<boolean>();

  const sendResponseMessage = (data: boolean) => {
    return popupWindowProxy.sendResponse({ data });
  };

  const handleReject = async () => {
    await sendResponseMessage(false);
    window.close();
  };

  const handleConnect = async () => {
    try {
      await dispatch(enableWebsite(connectData.hostnameSelected, network));
      await dispatch(flushSelectedHostname(network));
    } finally {
      await sendResponseMessage(true);
      window.close();
    }
  };

  const debouncedHandleConnect = useRef(
    debounce(handleConnect, 2000, { leading: true, trailing: false })
  ).current;

  // send response message false when user closes the window without answering
  window.addEventListener('beforeunload', () => sendResponseMessage(false));

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Enable"
    >
      <h1 className="text-2xl font-medium break-all">{connectData.hostnameSelected}</h1>

      <p className="mt-2 text-base font-medium">Connect with Marina</p>

      <p className="mt-8 text-base font-medium">Give permission to this site to:</p>

      {permissions.map((p, i) => (
        <div className="flex mt-4 text-left" key={i}>
          <img className="mr-4" src="/assets/images/checkbox-checked.svg" alt="checkbox" />
          <span className="font-regular text-base">{p}</span>
        </div>
      ))}

      <ButtonsAtBottom>
        <Button isOutline={true} onClick={handleReject} textBase={true}>
          Reject
        </Button>
        <Button onClick={debouncedHandleConnect} textBase={true}>
          Connect
        </Button>
      </ButtonsAtBottom>
    </ShellConnectPopup>
  );
};

export default connectWithConnectData(ConnectEnableView);
