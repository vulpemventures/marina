import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Shell from '../../components/shell';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import { MnemonicField } from './mnemonic-field';
import OnboardingForm from '../onboarding-form';
import { init } from '../../../domain/repository';
import {
  appRepository,
  onboardingRepository,
  sendFlowRepository,
} from '../../../infrastructure/storage/common';
import { validateMnemonic } from 'bip39';
import type { RestorationJSON, RestorationJSONDictionary } from '../../../application/account';
import { extractErrorMessage } from '../../utility/error';

const WalletRestore: React.FC = () => {
  const history = useHistory();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [restoration, setRestoration] = useState<RestorationJSONDictionary>();
  const [fileUploadError, setFileUploadError] = useState<string>();

  const onSubmit = async ({ password }: { password: string }) => {
    if (mnemonic === '' || !validateMnemonic(mnemonic)) throw new Error('need a valid mnemonic');
    await init(appRepository, sendFlowRepository);
    await onboardingRepository.setOnboardingPasswordAndMnemonic(password, mnemonic);
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

function checkRestorationDictionary(dictionary: any): dictionary is RestorationJSONDictionary {
  try {
    const possibleFields = ['liquid', 'testnet', 'regtest'];
    for (const field of possibleFields) {
      if (field in dictionary) {
        if (!Array.isArray(dictionary[field])) return false;
        for (const obj of dictionary[field]) {
          if (!isRestoration(obj)) return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

function isRestoration(obj: Record<string, unknown>): obj is RestorationJSON {
  return 'accountName' in obj && 'artifacts' in obj && 'pathToArguments' in obj;
}

export default WalletRestore;
