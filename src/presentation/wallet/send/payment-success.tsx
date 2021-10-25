import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import useLottieLoader from '../../hooks/use-lottie-loader';
import Button from '../../components/button';
import browser from 'webextension-polyfill';
import { DEFAULT_ROUTE } from '../../routes/constants';
import { useDispatch } from 'react-redux';
import { flushPendingTx } from '../../../application/redux/actions/transaction';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { AccountID } from '../../../domain/account';
import { txsUpdateTask, utxosUpdateTask } from '../../../application/redux/actions/updater';

interface LocationState {
  txid: string;
  accountIDs: AccountID[];
}

export interface PaymentSuccessProps {
  electrsExplorerURL: string;
}

const PaymentSuccessView: React.FC<PaymentSuccessProps> = ({ electrsExplorerURL }) => {
  const { state } = useLocation<LocationState>();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const history = useHistory();

  // Populate ref div with svg animation
  const checkmarkLoaderRef = React.useRef(null);
  useLottieLoader(checkmarkLoaderRef, '/assets/animations/checkmark.json');

  const handleOpenExplorer = () =>
    browser.tabs.create({
      url: `${electrsExplorerURL}/tx/${state.txid}`,
      active: false,
    });

  const handleBackToHome = () => history.push(DEFAULT_ROUTE);

  // Cleanup and change address derivation
  useEffect(() => {
    void (async () => {
      await dispatch(flushPendingTx());

      await Promise.all(
        (state.accountIDs ?? [])
          .flatMap((ID) => [utxosUpdateTask(ID), txsUpdateTask(ID)])
          .map(dispatch)
      ).catch(console.error);
    })();
  }, []);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Success"
      hasBackBtn={false}
    >
      <h1 className="mt-8 text-lg font-medium">Payment successful !</h1>
      <div className="flex items-center justify-center px-20 mt-8" ref={checkmarkLoaderRef} />
      <Button className="w-44 container mx-auto mt-10" onClick={handleOpenExplorer} textBase={true}>
        See in Explorer
      </Button>
      <button className="container flex flex-row-reverse mt-24" onClick={handleBackToHome}>
        <span className="text-primary text-sm font-bold">Go to Home</span>
        <img className="mr-2" src="/assets/images/arrow-narrow-right.svg" alt="navigate home" />
      </button>
    </ShellPopUp>
  );
};

export default PaymentSuccessView;
