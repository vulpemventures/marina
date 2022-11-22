import React from 'react';
import { useHistory, useLocation } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import Button from '../../components/button';
import { SOMETHING_WENT_WRONG_ERROR } from '../../../application/utils/constants';
import { SEND_CONFIRMATION_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { useDispatch, useSelector } from 'react-redux';
import { selectHTTPExplorerURL } from '../../../application/redux/selectors/app.selector';
import { broadcastTx } from '../../../application/utils/network';
import type { UnblindedOutput } from 'ldk';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { lockUtxo } from '../../../application/redux/actions/utxos';

interface LocationState {
  error: string;
  tx: string;
  selectedUtxos: UnblindedOutput[];
}

const PaymentError: React.FC = () => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();
  const explorer = useSelector(selectHTTPExplorerURL());
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const handleRetry = async () => {
    const txid = await broadcastTx(explorer, state.tx);
    if (!txid) throw new Error('something went wrong with the tx broadcasting');
    // lock utxos used in successful broadcast
    for (const utxo of state.selectedUtxos) {
      await dispatch(lockUtxo(utxo));
    }
    // navigate to payment success page
    history.push({
      pathname: SEND_PAYMENT_SUCCESS_ROUTE,
      state: { txid },
    });
  };

  const handleBackBtn = () => {
    history.push({
      pathname: SEND_CONFIRMATION_ROUTE,
    });
  };

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Error"
    >
      <h1 className="mt-8 text-lg font-medium">{SOMETHING_WENT_WRONG_ERROR}</h1>
      <p className="font-small mt-4 text-sm break-all">{state?.error}</p>
      <img className="my-14 mx-auto" src="/assets/images/cross.svg" alt="error" />
      <Button className="w-36 container mx-auto mt-10" onClick={handleRetry} textBase={true}>
        Retry
      </Button>
    </ShellPopUp>
  );
};

export default PaymentError;
