import React from 'react';
import { useHistory, useLocation } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import Button from '../../components/button';
import {
  INVALID_PASSWORD_ERROR,
  SOMETHING_WENT_WRONG_ERROR,
} from '../../../application/utils/constants';
import { SEND_CONFIRMATION_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { useDispatch, useSelector } from 'react-redux';
import { selectEsploraURL } from '../../../application/redux/selectors/app.selector';

import { broadcastTx } from '../../../application/utils/network';
import { UnblindedOutput } from 'ldk';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { lockUtxo } from '../../../application/redux/actions/utxos';

interface LocationState {
  error: string;
  tx: string;
  selectedUtxos: UnblindedOutput[];
}

const PaymentError: React.FC = () => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();
  const explorer = useSelector(selectEsploraURL);
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const handleRetry = () =>
    broadcastTx(explorer, state.tx)
      .then((txid) => {
        // lock utxos used in successful broadcast
        for (const utxo of state.selectedUtxos) {
          void dispatch(lockUtxo(utxo));
        }
        history.push({
          pathname: SEND_PAYMENT_SUCCESS_ROUTE,
          state: { txid },
        });
      })
      .catch((error) => {
        console.error(error.message);
      });

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
      {state?.error !== INVALID_PASSWORD_ERROR && (
        <Button className="w-36 container mx-auto mt-10" onClick={handleRetry} textBase={true}>
          Retry
        </Button>
      )}
    </ShellPopUp>
  );
};

export default PaymentError;
