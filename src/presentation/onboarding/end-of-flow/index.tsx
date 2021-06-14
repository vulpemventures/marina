import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { onBoardingCompleted } from '../../../application/redux/actions/app';
import { flushOnboarding } from '../../../application/redux/actions/onboarding';
import { updateUtxos } from '../../../application/redux/actions/utxos';
import { setWalletData } from '../../../application/redux/actions/wallet';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { OnboardingState } from '../../../application/redux/reducers/onboarding-reducer';
import { provisionBackgroundScript } from '../../../application/utils/provision';
import { createWalletFromMnemonic } from '../../../application/utils/wallet';
import { createMnemonic } from '../../../domain/mnemonic';
import { Network } from '../../../domain/network';
import { createPassword } from '../../../domain/password';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';

export interface EndOfFlowProps {
  onboarding: OnboardingState;
  network: Network;
}

const EndOfFlowOnboardingView: React.FC<EndOfFlowProps> = ({ onboarding, network }) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const walletData = await createWalletFromMnemonic(
        createPassword(onboarding.password),
        createMnemonic(onboarding.mnemonic, network),
        network
      );

      await dispatch(setWalletData(walletData));

      // Startup alarms to fetch utxos & set the popup page
      await provisionBackgroundScript();
      await dispatch(onBoardingCompleted());
      await dispatch(updateUtxos());
      setIsLoading(false);
      await dispatch(flushOnboarding());
    })().catch(console.error);
  }, []);

  if (isLoading) {
    return <MermaidLoader className="flex items-center justify-center h-screen p-24" />;
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
