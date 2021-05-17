import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import useLottieLoader from '../../hooks/use-lottie-loader';
import Button from '../../components/button';
import { browser } from 'webextension-polyfill-ts';
import { esploraURL } from '../../utils';
import { DEFAULT_ROUTE } from '../../routes/constants';
import { Address } from '../../../domain/wallet/value-objects';
import { Network } from '../../../domain/app/value-objects';
import { IWallet } from '../../../domain/wallet/wallet';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../..';
import { flushTx } from '../../../application/redux/actions/transaction';
import { deriveNewAddress, setAddress } from '../../../application/redux/actions/wallet';

interface LocationState {
  changeAddress?: Address;
  txid: string;
}

export interface PaymentSuccessProps {
  network: Network;
  wallet: IWallet;
}

const PaymentSuccessView: React.FC<PaymentSuccessProps> = ({ network, wallet }) => {
  const { state } = useLocation<LocationState>();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const history = useHistory();

  // Populate ref div with svg animation
  const checkmarkLoaderRef = React.useRef(null);
  useLottieLoader(checkmarkLoaderRef, '/assets/animations/checkmark.json');

  const handleOpenExplorer = () =>
    browser.tabs.create({
      url: `${esploraURL[network.value]}/tx/${state.txid}`,
      active: false,
    });

  const handleBackToHome = () => history.push(DEFAULT_ROUTE);

  // Cleanup and change address derivation
  useEffect(() => {
    // persist change addresses before unsetting the pending tx
    if (state.changeAddress?.value) {
      if (wallet.pendingTx?.props.feeAsset !== wallet.pendingTx?.props.sendAsset) {
        deriveNewAddress(wallet, network, true).then(dispatch);
      }
      dispatch(setAddress(state.changeAddress));
    }
    flushTx(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
