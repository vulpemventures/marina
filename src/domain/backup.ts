import type { Argument, Artifact } from '@ionio-lang/ionio';

type contractName = string;

export type RestorationJSON = {
  accountName: string;
  artifacts: Record<contractName, Artifact>;
  pathToArguments: Record<string, [contractName, Argument[]]>;
};

export type RestorationJSONDictionary = {
  [network: string]: RestorationJSON[];
};

// attach a version number for later updates
export type BackupDataVersion = 0;

export interface BackupData {
  version: BackupDataVersion;
  ionioAccountsRestorationDictionary: RestorationJSONDictionary;
}

export interface BackupService {
  save(data: Partial<BackupData>): Promise<void>;
  load(): Promise<BackupData>;
  delete(): Promise<void>;
  initialize(): Promise<void>;
}

export enum BackupServiceType {
  BROWSER_SYNC = 'browser-sync',
}

export interface BackupConfig {
  ID: string; // Unique ID for the backup service
  type: BackupServiceType;
}
