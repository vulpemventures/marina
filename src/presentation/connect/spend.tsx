/* eslint react-hooks/rules-of-hooks: 0 */
import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../components/button';
import Broker from '../../application/content-script';
import ShellConnectPopup from '../components/shell-connect-popup';
import { AppContext } from '../../application/store/context';
import { formatAddress } from '../utils';
import { decodePset } from 'ldk';

function useQuery(key: string) {
  const queryString = new URLSearchParams(useLocation().search);
  return queryString.get(key);
}

const ConnectSpend: React.FC = () => {
  let recipient = '';
  let assetAmount = '';
  let assetHash = '';
  let assetTicker = '';
  let tx = '';
  //
  const [{ app, assets }] = useContext(AppContext);
  const broker = new Broker();
  const hostname = useQuery('origin');
  const method = useQuery('method');
  if (method === 'sendTransaction') {
    recipient = useQuery('recipient') as string;
    assetAmount = useQuery('amount') as string;
    assetHash = useQuery('assetHash') as string;
    assetTicker = assetHash ? assets[app.network.value][assetHash]?.ticker : 'Unknown';
  }

  if (method === 'signTransaction') {
    tx = useQuery('tx') as string;
    const decodedTx = decodePset(tx);
    console.log('decodedTx', decodedTx);
  }

  const handleReject = () => {
    broker.port.postMessage({ id: 'connect-popup', name: method, params: [false] });
    broker.port.onMessage.addListener(() => window.close());
  };

  const handleAccept = () => {
    if (method === 'sendTransaction') {
      broker.port.postMessage({
        id: 'connect-popup',
        name: method,
        params: [true, recipient, assetAmount, assetHash],
      });
    }
    if (method === 'signTransaction') {
      broker.port.postMessage({
        id: 'connect-popup',
        name: method,
        params: [true, tx],
      });
    }
    broker.port.onMessage.addListener(({ payload }) => {
      if (payload.success) {
        window.close();
      }
    });
  };

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      <h1 className="mt-8 text-2xl font-medium break-all">{hostname}</h1>

      <p className="mt-4 text-base font-medium">Requests you to spend</p>

      <div className="container flex justify-between mt-16">
        <span className="text-lg font-medium">{assetAmount}</span>
        <span className="text-lg font-medium">{assetTicker}</span>
      </div>

      <div className="container flex items-baseline justify-between mt-4">
        <span className="mr-2 text-lg font-medium">To: </span>
        <span className="font-small text-sm break-all">{formatAddress(recipient)}</span>
      </div>

      <div className="bottom-24 container absolute right-0 flex justify-between">
        <Button isOutline={true} onClick={handleReject} textBase={true}>
          Reject
        </Button>
        <Button onClick={handleAccept} textBase={true}>
          Accept
        </Button>
      </div>
    </ShellConnectPopup>
  );
};

export default ConnectSpend;
