import * as ecc from 'tiny-secp256k1';
import zkp from '@vulpemventures/secp256k1-zkp';
import { Artifact, Contract, Argument } from '@ionio-lang/ionio';
import { networks, payments } from 'liquidjs-lib';
import type { NetworkString } from 'marina-provider';

const zkpLib = await zkp();

export const MainAccountLegacy = 'mainAccountLegacy';
export const MainAccount = 'mainAccount';
export const MainAccountTest = 'mainAccountTest';

export interface ScriptBuilder {
  makeScript: (publicKey: Buffer) => Buffer;
}

export enum AccountType {
  P2WPH = 'p2wpkh',
  Ionio = 'ionio',
}

export interface AccountDetails {
  accountType: AccountType;
  baseDerivationPath: string;
  masterPublicKey: string; // base58 encoded master key (xpub derived using baseDerivationPath)
  lastUsedIndexes: Record<NetworkString, { internal: number; external: number }>;
  accountNetworks: NetworkString[];
}

export interface IonioAccountDetails extends AccountDetails {
  accountType: AccountType.Ionio;
  artifact: Artifact;
  changeArtifact?: Artifact;
  constructorArgs: Record<string, Argument>;
}

export function isIonioAccountDetails(account: AccountDetails): account is IonioAccountDetails {
  return account.accountType === AccountType.Ionio;
}

export interface ScriptDetails {
  network: NetworkString;
  accountName: string;
  derivationPath?: string;
  blindingPrivateKey?: string;
}
