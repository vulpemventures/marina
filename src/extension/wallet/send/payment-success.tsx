import React from 'react';
import { useHistory, useLocation } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import useLottieLoader from '../../hooks/use-lottie-loader';
import Button from '../../components/button';
import browser from 'webextension-polyfill';
import { DEFAULT_ROUTE } from '../../routes/constants';
import { Transaction } from 'liquidjs-lib';
import { makeURLwithBlinders } from '../../../domain/transaction';
import { useStorageContext } from '../../context/storage-context';

interface LocationState {
  text?: string;
  txhex: string;
}

const PaymentSuccessView: React.FC = () => {
  const { appRepository, walletRepository } = useStorageContext();
  const { state } = useLocation<LocationState>();
  const history = useHistory();

  // Populate ref div with svg animation
  const checkmarkLoaderRef = React.useRef(null);
  useLottieLoader(checkmarkLoaderRef, '/assets/animations/checkmark.json');

  const handleOpenExplorer = async () => {
    const tx = Transaction.fromHex(state.txhex);
    const url = await makeURLwithBlinders(tx, appRepository, walletRepository);
    await browser.tabs.create({
      url,
      active: false,
    });
  };

  const handleBackToHome = () => history.push(DEFAULT_ROUTE);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Success"
      hasBackBtn={false}
    >
      <h1 className="mt-8 text-lg font-medium">{state.text ?? 'Payment successful!'}</h1>
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
