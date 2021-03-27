import React, { useContext } from 'react';
import { useHistory, useLocation } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import Button from '../../components/button';
import { broadcastTx, explorerApiUrl } from '../../../application/utils';
import { AppContext } from '../../../application/store/context';
import { SEND_CONFIRMATION_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { Address } from '../../../domain/wallet/value-objects';

interface LocationState {
  changeAddress?: Address;
  error: string;
  tx: string;
}

const PaymentError: React.FC = () => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();
  const [{ app }] = useContext(AppContext);

  const handleRetry = () =>
    broadcastTx(explorerApiUrl[app.network.value], state.tx)
      .then((txid) => {
        history.push({
          pathname: SEND_PAYMENT_SUCCESS_ROUTE,
          state: { changeAddress: state.changeAddress, txid: txid },
        });
      })
      .catch((error) => {
        console.error(error.message);
      });

  const handleBackBtn = () => {
    history.push({
      pathname: SEND_CONFIRMATION_ROUTE,
      state: { changeAddress: state.changeAddress },
    });
  };

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Error"
    >
      <h1 className="mt-8 text-lg font-medium">Oops, Something went wrong...</h1>
      <p className="font-small mt-4 text-sm">{state.error}</p>
      <img className="my-14 mx-auto" src="/assets/images/cross.svg" alt="error" />
      {state.error !== 'Invalid password' && (
        <Button className="w-36 container mx-auto mt-10" onClick={handleRetry} textBase={true}>
          Retry
        </Button>
      )}
    </ShellPopUp>
  );
};

export default PaymentError;
