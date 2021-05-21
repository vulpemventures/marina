import React, { useState, useEffect } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import WindowProxy from '../../application/proxy';
import { browser } from 'webextension-polyfill-ts';
import { useSelector } from 'react-redux';
import {
  connectWithConnectData,
  WithConnectDataProps,
} from '../../application/redux/containers/with-connect-data.container';

const permissions = ['View confidential addresses of your wallet', 'View balances of your wallet'];

const ConnectEnableView: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const windowProxy = new WindowProxy();

  const handleReject = async () => {
    try {
      await windowProxy.proxy('ENABLE_RESPONSE', [false]);
      window.close();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnect = async () => {
    try {
      await windowProxy.proxy('ENABLE_RESPONSE', [true]);
      window.close();
    } catch (e) {
      console.error(e);
    }
  };

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
        <Button onClick={handleConnect} textBase={true}>
          Connect
        </Button>
      </div>
    </ShellConnectPopup>
  );
};

export default connectWithConnectData(ConnectEnableView);
