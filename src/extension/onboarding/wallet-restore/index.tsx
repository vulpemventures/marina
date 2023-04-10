import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Shell from '../../components/shell';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import { MnemonicField } from './mnemonic-field';
import OnboardingForm from '../onboarding-form';
import { init } from '../../../domain/repository';
import { validateMnemonic } from 'bip39';
import { useStorageContext } from '../../context/storage-context';
import type { BackupFormValues} from '../../components/restoration-backup-form';
import { RestorationBackupForm } from '../../components/restoration-backup-form';

const WalletRestore: React.FC = () => {
  const { appRepository, sendFlowRepository, onboardingRepository } = useStorageContext();
  const history = useHistory();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [backupValues, setBackupValues] = useState<BackupFormValues>();

  const onSubmit = async ({ password }: { password: string }) => {
    if (mnemonic === '' || !validateMnemonic(mnemonic.trim()))
      throw new Error('need a valid mnemonic');

    await init(appRepository, sendFlowRepository);
    await onboardingRepository.setOnboardingPasswordAndMnemonic(password, mnemonic.trim());
    await appRepository.updateStatus({ isMnemonicVerified: true }); // set the mnemonic as verified cause we are in the restore mnemonic flow

    if (backupValues?.restoration)
      await onboardingRepository.setRestorationJSONDictionary(backupValues.restoration);
    if (backupValues?.backupServicesConfigs && backupValues.backupServicesConfigs.length > 0)
      await onboardingRepository.setBackupServicesConfiguration(backupValues.backupServicesConfigs);
    history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  };

  return (
    <Shell>
      <h2 className="mb-4 text-3xl font-medium">Restore a wallet from a mnemonic phrase</h2>
      <p className="mb-2 font-medium">
        Enter your secret twelve words of your mnemonic phrase to Restore your wallet
      </p>
      <MnemonicField value={mnemonic} onChange={(mnemo) => setMnemonic(mnemo)} />

      <p className="mt-2 mb-2 font-medium">Restore Ionio accounts</p>
      <div className="w-1/2">
        <RestorationBackupForm
          onSubmit={(values) => {
            setBackupValues(values);
          }}
        />
      </div>

      <OnboardingForm onSubmit={onSubmit} />
    </Shell>
  );
};

export default WalletRestore;
