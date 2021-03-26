import React, { useState, useEffect } from 'react';
import Button from '../components/button';
import Broker from '../../application/content-script';
import ShellConnectPopup from '../components/shell-connect-popup';
import { repos } from '../../infrastructure';
import { makeid } from '../../application/marina';

const ConnectEnable: React.FC = () => {
  const [hostname, setHostname] = useState<string>('');

  useEffect(() => {
    void (async (): Promise<void> => {
      const network = (await repos.app.getApp()).network.value;
      const data = await repos.connect.getConnectData();
      const hostname = data[network].enableSitePending;
      setHostname(hostname);
    })();
  }, []);

  const broker = new Broker();
  const idParam = makeid(16);
  const permissions = ['View addresses of your wallet'];

  const handleReject = () => {
    broker.port.postMessage({ id: idParam, name: 'enableResponse', params: [false] });
    broker.port.onMessage.addListener(({ id, payload }) => {
      if (!payload.success && id === idParam) {
        window.close();
      }
    });
  };

  const handleConnect = () => {
    broker.port.postMessage({ id: idParam, name: 'enableResponse', params: [true] });
    broker.port.onMessage.addListener(({ id, payload }) => {
      if (payload.success && id === idParam) {
        window.close();
      }
    });
  };

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Enable"
    >
      <h1 className="mt-8 text-2xl font-medium break-all">{hostname}</h1>

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

export default ConnectEnable;
