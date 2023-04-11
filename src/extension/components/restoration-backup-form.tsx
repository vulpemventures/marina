import type { AccountID } from 'marina-provider';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { checkRestorationDictionary } from '../../application/account';
import type { BackupConfig, RestorationJSONDictionary } from '../../domain/backup';
import { BackupServiceType } from '../../domain/backup';
import { BrowserSyncBackup } from '../../port/browser-sync-backup-service';
import { extractErrorMessage } from '../utility/error';
import Button from './button';
import { Spinner } from './spinner';
import Modal from './modal';
import type { GithubBackupServiceConfig } from '../../port/github-backup-service';
import { GithubBackupService } from '../../port/github-backup-service';
import GithubBackupForm from './github-backup-form';

export type BackupFormValues = {
  restoration: RestorationJSONDictionary;
  backupServicesConfigs: BackupConfig[];
};

export type RestorationBackupFormProps = {
  onSubmit: (values: BackupFormValues) => void;
};

export const RestorationBackupForm: React.FC<RestorationBackupFormProps> = ({ onSubmit }) => {
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [restorationError, setRestorationError] = useState<string>();
  const [values, setValues] = useState<BackupFormValues>({
    restoration: {},
    backupServicesConfigs: [],
  });
  const [loadingText, setLoadingText] = useState<string>();

  // github config
  const [githubConfigModalOpen, setGithubConfigModalOpen] = useState(false);

  useEffect(() => {
    onSubmit(values);
  }, [values]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      setIsLoading(true);
      setLoadingText('Restoring from file...');
      setRestorationError(undefined);
      const strContent = await e.target.files![0].text();
      const restoration = JSON.parse(strContent);
      if (!checkRestorationDictionary(restoration)) throw new Error('invalid restoration file');
      const newValues = {
        ...values,
        restoration,
      };
      setValues(newValues);
    } catch (e) {
      console.error(e);
      setRestorationError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
      setLoadingText(undefined);
    }
  };

  const handleRestoreFromBrowserSync = async () => {
    setIsLoading(true);
    setLoadingText('Restoring from Browser Sync...');
    setRestorationError(undefined);
    try {
      const browserSyncBackupService = new BrowserSyncBackup();
      await browserSyncBackupService.initialize();
      const { ionioAccountsRestorationDictionary } = await browserSyncBackupService.load();
      setValues({
        ...values,
        restoration: ionioAccountsRestorationDictionary,
        backupServicesConfigs: [
          ...values.backupServicesConfigs,
          { ID: 'browser-sync', type: BackupServiceType.BROWSER_SYNC },
        ],
      });
    } catch (e) {
      console.error(e);
      setRestorationError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
      setLoadingText(undefined);
    }
  };

  const handleRestoreFromGithub = async (token: string) => {
    setIsLoading(true);
    setLoadingText('Restoring from Github...');
    setRestorationError(undefined);
    try {
      const githubBackupService = new GithubBackupService({ githubAccessToken: token });
      await githubBackupService.initialize();
      const { ionioAccountsRestorationDictionary } = await githubBackupService.load();
      setValues({
        ...values,
        restoration: ionioAccountsRestorationDictionary,
        backupServicesConfigs: [
          ...values.backupServicesConfigs,
          {
            ID: 'github',
            type: BackupServiceType.GITHUB,
            githubAccessToken: token,
          } as GithubBackupServiceConfig,
        ],
      });
    } catch (e) {
      console.error(e);
      setRestorationError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
      setLoadingText(undefined);
    }
  };

  return (
    <div>
      {Object.keys(values.restoration).length === 0 && values.backupServicesConfigs.length === 0 ? (
        <div>
          {!isLoading ? (
            <div className="flex space-x-4">
              <Button
                isTextSmall
                isOutline
                disabled={isLoading}
                onClick={() => {
                  setGithubConfigModalOpen(true);
                }}
              >
                Github
              </Button>

              <Button
                isTextSmall
                isOutline
                disabled={isLoading}
                onClick={() => hiddenFileInputRef.current?.click()}
              >
                Upload JSON File
              </Button>

              <Button
                isTextSmall
                isOutline
                disabled={isLoading}
                onClick={() => handleRestoreFromBrowserSync()}
              >
                Browser Sync
              </Button>
            </div>
          ) : (
            <>
              <Spinner />
              <p className="animate-pulse">{loadingText || 'Loading...'}</p>
            </>
          )}
        </div>
      ) : (
        <div className="border-grayLight relative flex flex-col justify-center p-4 border-2">
          <div
            onClick={() => {
              setRestorationError(undefined);
              setLoadingText(undefined);
              setValues({
                restoration: {},
                backupServicesConfigs: [],
              });
              setIsLoading(false);
            }}
            className="absolute top-1 right-0.5"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          {Object.keys(values.restoration).length > 0 ? (
            <>
              <p className="text-primary font-bold">Successfully restored</p>
              <p>Networks: {Object.keys(values.restoration).join(', ') || 0}</p>
              <p>
                Number of accounts:{' '}
                {
                  Object.entries(values.restoration).reduce(
                    (acc, [_, restorations]) =>
                      new Set([...acc, ...restorations.map((r) => r.accountName)]),
                    new Set<AccountID>()
                  ).size
                }{' '}
              </p>
            </>
          ) : (
            <p className="text-primary font-bold">Successfully loaded, no backup found</p>
          )}
          {values.backupServicesConfigs.length > 0 && (
            <p className="text-sm italic">Browser backup will be enabled</p>
          )}
        </div>
      )}
      <input
        ref={hiddenFileInputRef}
        className="invisible"
        id="file_input"
        type="file"
        onChange={handleFileChange}
      />
      {restorationError && <p className="text-red h-10 mt-2 text-xs">{restorationError}</p>}
      <Modal
        withoutMinHeight
        isOpen={githubConfigModalOpen}
        onClose={() => setGithubConfigModalOpen(false)}
      >
        <div className="flex">
          <h4>Link Marina with Github</h4>
        </div>
        <GithubBackupForm
          onSubmit={(token) => {
            setGithubConfigModalOpen(false);
            handleRestoreFromGithub(token).catch(console.error);
          }}
        />
      </Modal>
    </div>
  );
};
