import React, { useContext, useEffect, useState } from 'react';
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

const EndOfFlow: React.FC = () => {
  const [{ wallets, onboarding }, dispatch] = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(true);

  // Populate ref div with svg animation
  const mermaidLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');

  useEffect(() => {
    if (wallets.length <= 0) {
      const onError = (err: Error) => console.log(err);
      const dispatchOnboardingCompleted = () => {
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
      <div className="flex items-center justify-center h-screen p-24" ref={mermaidLoaderRef} />
    );
  }

  return (
    <Shell hasBackBtn={false}>
      <h1 className="text-5xl">Congratulations!</h1>
      <p className="mt-4">
        Your wallet is ready. You can close this page and open the extension from the browser
        toolbar
      </p>
      <img className="w-72 mb-14 mt-10" src="/assets/images/mermaid.png" alt="mermaid" />
    </Shell>
  );
};

export default EndOfFlow;
