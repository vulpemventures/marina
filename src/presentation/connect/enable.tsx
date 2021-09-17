import React, { useRef } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import {
  connectWithConnectData,
  WithConnectDataProps,
} from '../../application/redux/containers/with-connect-data.container';
import { useDispatch, useSelector } from 'react-redux';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { enableWebsite, flushSelectedHostname } from '../../application/redux/actions/connect';
import { RootReducerState } from '../../domain/common';
import { debounce } from 'lodash';
import WindowProxy from '../../inject/proxy';

const permissions = ['View confidential addresses of your wallet', 'View balances of your wallet'];

const ConnectEnableView: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const network = useSelector((state: RootReducerState) => state.app.network);
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const windowProxy = new WindowProxy();

  const handleReject = async () => {
    await windowProxy.proxy('enable');
    window.close();
  };

  const handleConnect = async () => {
    try {
      await dispatch(enableWebsite(connectData.hostnameSelected, network));
      await dispatch(flushSelectedHostname(network));
    } finally {
      await windowProxy.proxy('enable');
      window.close();
    }
  };

  const debouncedHandleConnect = useRef(
    debounce(handleConnect, 2000, { leading: true, trailing: false })
  ).current;

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Enable"
    >
      <h1 className="mt-8 text-2xl font-medium break-all">{connectData.hostnameSelected}</h1>

      <p className="mt-4 text-base font-medium">Connect with Marina</p>

      <p className="mt-12 text-base font-medium">Give permission to this site to:</p>

      {permissions.map((p, i) => (
        <div className="container flex mt-10 text-left" key={i}>
          <img className="mr-4" src="/assets/images/checkbox-checked.svg" alt="checkbox" />
          <span className="font-regular text-base">{p}</span>
        </div>
      ))}

      <div className="bottom-24 container absolute right-0 flex justify-between">
        <Button isOutline={true} onClick={handleReject} textBase={true}>
          Reject
        </Button>
        <Button onClick={debouncedHandleConnect} textBase={true}>
          Connect
        </Button>
      </div>
    </ShellConnectPopup>
  );
};

export default connectWithConnectData(ConnectEnableView);
