import React from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../components/button';
import Broker from '../../application/content-script';
import ShellConnectPopup from '../components/shell-connect-popup';

function useQuery(key: string) {
  const queryString = new URLSearchParams(useLocation().search);
  return queryString.get(key);
}

const ConnectEnable: React.FC = () => {
  const broker = new Broker();
  const hostname = useQuery('origin');

  const permissions = ['View addresses of your wallet'];
  const websiteTitle = hostname;
  const handleReject = () => {
    broker.port.postMessage({ id: 'connect-popup', name: 'enable', params: [false] });
    broker.port.onMessage.addListener(() => window.close());
  };
  const handleConnect = (e: any) => {
    broker.port.postMessage({ id: 'connect-popup', name: 'enable', params: [true, hostname] });
    broker.port.onMessage.addListener(({ payload }) => {
      if (payload.success) {
        window.close();
      }
    });
  };

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Enable"
    >
      <h1 className="mt-8 text-2xl font-medium break-all">{websiteTitle}</h1>

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
