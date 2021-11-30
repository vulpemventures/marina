import { NetworkString } from 'ldk';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { onboardingCompleted, reset } from '../../../application/redux/actions/app';
import { flushOnboarding } from '../../../application/redux/actions/onboarding';
import { setWalletData } from '../../../application/redux/actions/wallet';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { setUpPopup } from '../../../application/utils/popup';
import { createWalletFromMnemonic } from '../../../application/utils/wallet';
import { createMnemonic } from '../../../domain/mnemonic';
import { createPassword } from '../../../domain/password';
import Button from '../../components/button';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';
import { extractErrorMessage } from '../../utils/error';

export interface EndOfFlowProps {
  mnemonic: string;
  password: string;
  isFromPopupFlow: boolean;
  network: NetworkString;
  explorerURL: string;
  hasMnemonicRegistered: boolean;
}

const EndOfFlowOnboardingView: React.FC<EndOfFlowProps> = ({
  mnemonic,
  password,
  isFromPopupFlow,
  network,
  explorerURL,
  hasMnemonicRegistered,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>();

  const tryToRestoreWallet = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(undefined);
      if (!isFromPopupFlow) {
        const walletData = await createWalletFromMnemonic(
          createPassword(password),
          createMnemonic(mnemonic),
          network,
          explorerURL
        );

        if (hasMnemonicRegistered) {
          await dispatch(reset());
        }
        await dispatch(setWalletData(walletData));

        // Startup alarms to fetch utxos & set the popup page
        await setUpPopup();
        await dispatch(onboardingCompleted());
      }
      await dispatch(flushOnboarding());
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    tryToRestoreWallet().catch(console.error);
  }, []);

  if (isLoading) {
    return <MermaidLoader className="flex items-center justify-center h-screen p-24" />;
  }

  return (
    <Shell hasBackBtn={false}>
      <h1 className="text-5xl">{errorMsg ? 'Restoration failed' : 'Congratulations!'}</h1>
      <p className="mt-4">
        {errorMsg ??
          'Your wallet is ready. You can close this page and open the extension from the browser toolbar'}
      </p>

      {errorMsg && (
        <Button
          className="w-36 container mx-auto mt-4"
          onClick={tryToRestoreWallet}
          textBase={true}
        >
          Retry
        </Button>
      )}

      {!errorMsg && (
        <img className="w-72 mb-14 mt-10" src="/assets/images/mermaid.png" alt="mermaid" />
      )}
    </Shell>
  );
};

export default EndOfFlowOnboardingView;
