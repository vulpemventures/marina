import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { onboardingCompleted } from '../../../application/redux/actions/app';
import { flushOnboarding } from '../../../application/redux/actions/onboarding';
import { setWalletData } from '../../../application/redux/actions/wallet';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { setUpPopup } from '../../../application/utils/popup';
import { createWalletFromMnemonic } from '../../../application/utils/wallet';
import { createMnemonic } from '../../../domain/mnemonic';
import { Network } from '../../../domain/network';
import { createPassword } from '../../../domain/password';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';

export interface EndOfFlowProps {
  mnemonic: string;
  password: string;
  isFromPopupFlow: boolean;
  network: Network;
  explorerURL: string;
}

const EndOfFlowOnboardingView: React.FC<EndOfFlowProps> = ({
  mnemonic,
  password,
  isFromPopupFlow,
  network,
  explorerURL,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isFromPopupFlow) {
        const walletData = await createWalletFromMnemonic(
          createPassword(password),
          createMnemonic(mnemonic),
          network,
          explorerURL
        );

        await dispatch(setWalletData(walletData));

        // Startup alarms to fetch utxos & set the popup page
        await setUpPopup();
        await dispatch(onboardingCompleted());
      }
      await dispatch(flushOnboarding());
    })()
      .catch(console.error)
      .finally(() => setIsLoading(false));
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
