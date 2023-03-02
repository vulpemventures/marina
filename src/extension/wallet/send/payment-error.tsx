import React from 'react';
import { useHistory, useLocation } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import Button from '../../components/button';
import { SOMETHING_WENT_WRONG_ERROR } from '../../../domain/constants';
import { SEND_CONFIRMATION_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import {
  appRepository,
  useSelectNetwork,
  walletRepository,
} from '../../../infrastructure/storage/common';
import { lockTransactionInputs } from '../../../domain/transaction';

interface LocationState {
  error: string;
  tx: string;
}

const PaymentError: React.FC = () => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();
  const network = useSelectNetwork();

  const handleRetry = async () => {
    if (state.tx) {
      const chainSource = await appRepository.getChainSource(network);
      if (!chainSource) throw new Error('chain source not found');
      const txid = await chainSource.broadcastTransaction(state?.tx);
      await lockTransactionInputs(walletRepository, state.tx);
      await chainSource.close();
      // navigate to payment success page
      history.push({
        pathname: SEND_PAYMENT_SUCCESS_ROUTE,
        state: { txid },
      });
    }
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
