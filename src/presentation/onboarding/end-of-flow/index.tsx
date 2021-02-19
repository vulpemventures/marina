import React, { useContext, useEffect, useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import {
  createWallet,
  onboardingComplete,
  restoreWallet,
  verifyWallet,
} from '../../../application/store/actions';
import { flush } from '../../../application/store/actions/onboarding';
import { AppContext } from '../../../application/store/context';
import { Mnemonic, Password } from '../../../domain/wallet/value-objects';
import Shell from '../../components/shell';
import useLottieLoader from '../../hooks/use-lottie-loader';

const POPUP = 'popup.html';

const EndOfFlow: React.FC = () => {
  const [{ wallets, onboarding }, dispatch] = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(true);

  // Populate ref div with svg animation
  const marinaLoaderRef = React.useRef(null);
  useLottieLoader(marinaLoaderRef);

  useEffect(() => {
    if (wallets.length <= 0) {
      const onError = (err: Error) => console.log(err);
      const dispatchOnboardingCompleted = () => {
        browser.browserAction.setPopup({ popup: POPUP }).catch(console.error);
        return dispatch(
          onboardingComplete(() => {
            dispatch(flush());
            setIsLoading(false);
          }, onError)
        );
      };
      let creator = createWallet;
      if (onboarding.restored) {
        creator = restoreWallet;
      }
      dispatch(
        creator(
          Password.create(onboarding.password),
          Mnemonic.create(onboarding.mnemonic),
          () => {
            if (onboarding.verified) {
              dispatch(verifyWallet(dispatchOnboardingCompleted, onError));
            } else {
              dispatchOnboardingCompleted();
            }
          },
          onError
        )
      );
    }
  });

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen p-24"
        id="marina-loader"
        ref={marinaLoaderRef}
      />
    );
  }

  return (
    <Shell hasBackBtn={false}>
      <h1 className="text-5xl">Congratulations !</h1>
      <p className="mt-4">You have just created a new wallet</p>
      <img className="w-72 mb-14 mt-10" src="/assets/images/mermaid.png" alt="mermaid" />
    </Shell>
  );
};

export default EndOfFlow;
