import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { onBoardingCompleted } from '../../../application/redux/actions/app';
import { flushOnboarding } from '../../../application/redux/actions/onboarding';
import { launchUtxosUpdater } from '../../../application/redux/actions/utxos';
import { createWallet, restoreWallet } from '../../../application/redux/actions/wallet';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { OnboardingState } from '../../../application/redux/reducers/onboarding-reducer';
import { provisionBackgroundScript } from '../../../application/utils/provision';
import { createWalletFromMnemonic } from '../../../application/utils/wallet';
import { createMnemonic } from '../../../domain/mnemonic';
import { Network } from '../../../domain/network';
import { createPassword } from '../../../domain/password';
import { IWallet } from '../../../domain/wallet';
import Shell from '../../components/shell';
import useLottieLoader from '../../hooks/use-lottie-loader';

export interface EndOfFlowProps {
  wallet: IWallet;
  onboarding: OnboardingState;
  network: Network;
}

const EndOfFlowOnboardingView: React.FC<EndOfFlowProps> = ({ wallet, onboarding, network }) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(true);

  // Populate ref div with svg animation
  const mermaidLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');

  useEffect(() => {
    (async () => {
      const walletData = await createWalletFromMnemonic(
        createPassword(onboarding.password),
        createMnemonic(onboarding.mnemonic),
        network
      );

      const createAction = onboarding.restored
        ? restoreWallet(walletData)
        : createWallet(walletData);

      await dispatch(createAction);

      // Startup alarms to fetch utxos & set the popup page
      await provisionBackgroundScript();
      await dispatch(onBoardingCompleted());
      await dispatch(launchUtxosUpdater());
      setIsLoading(false);
      await dispatch(flushOnboarding());
    })().catch(console.error);
  }, []);

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

export default EndOfFlowOnboardingView;
