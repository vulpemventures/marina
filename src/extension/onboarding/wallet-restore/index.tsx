import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Shell from '../../components/shell';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import { MnemonicField } from './mnemonic-field';
import OnboardingForm from '../onboarding-form';
import { init } from '../../../domain/repository';
import { validateMnemonic } from 'bip39';
import type { RestorationJSONDictionary } from '../../../application/account';
import { checkRestorationDictionary } from '../../../application/account';
import { extractErrorMessage } from '../../utility/error';
import { useStorageContext } from '../../context/storage-context';

const WalletRestore: React.FC = () => {
  const { appRepository, receiveFlowRepository, sendFlowRepository, onboardingRepository } =
    useStorageContext();
  const history = useHistory();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [restoration, setRestoration] = useState<RestorationJSONDictionary>();
  const [fileUploadError, setFileUploadError] = useState<string>();

  const onSubmit = async ({ password }: { password: string }) => {
    if (mnemonic === '' || !validateMnemonic(mnemonic.trim()))
      throw new Error('need a valid mnemonic');
    await init(appRepository, receiveFlowRepository, sendFlowRepository);
    await onboardingRepository.setOnboardingPasswordAndMnemonic(password, mnemonic.trim());
    await appRepository.updateStatus({ isMnemonicVerified: true }); // set the mnemonic as verified cause we are in the restore mnemonic flow
    if (restoration) await onboardingRepository.setRestorationJSONDictionary(restoration);
    history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      const strContent = await e.target.files![0].text();
      const dictionary = JSON.parse(strContent);
      if (!checkRestorationDictionary(dictionary)) throw new Error('invalid restoration file');
      setRestoration(dictionary);
    } catch (e) {
      console.error(e);
      setFileUploadError(extractErrorMessage(e));
    }
  };

  return (
    <Shell>
      <h2 className="mb-4 text-3xl font-medium">Restore a wallet from a mnemonic phrase</h2>
      <p className="mb-2 font-medium">
        Enter your secret twelve words of your mnemonic phrase to Restore your wallet
      </p>
      <MnemonicField value={mnemonic} onChange={(mnemo) => setMnemonic(mnemo)} />

      <p className="mt-2 mb-2 font-medium">Ionio restoration file (optional)</p>
      <input
        className="border-grayLight focus:ring-primary focus:border-primary sm:text-sm placeholder-grayLight block w-3/5 border-2 rounded-md shadow-sm"
        id="file_input"
        type="file"
        onChange={handleFileChange}
      />
      {fileUploadError && <p className="text-red h-10 mt-2 text-xs">{fileUploadError}</p>}

      <OnboardingForm onSubmit={onSubmit} />
    </Shell>
  );
};

export default WalletRestore;
