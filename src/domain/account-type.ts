import type { Artifact, Argument } from '@ionio-lang/ionio';
import type { NetworkString } from 'marina-provider';

export const MainAccountLegacy = 'mainAccountLegacy';
export const MainAccount = 'mainAccount';
export const MainAccountTest = 'mainAccountTest';

export interface ScriptBuilder {
  makeScript: (publicKey: Buffer) => Buffer;
}

export enum AccountType {
  P2WPKH = 'p2wpkh',
  Ionio = 'ionio',
}

export interface AccountDetails {
  accountType: AccountType;
  baseDerivationPath: string;
  masterPublicKey: string; // base58 encoded master key (xpub derived using baseDerivationPath)
  nextKeyIndexes: Record<NetworkString, { internal: number; external: number }>;
  accountNetworks: NetworkString[];
}

export interface ScriptDetails {
  network: NetworkString;
  accountName: string;
  derivationPath?: string;
  blindingPrivateKey?: string;
}

// data structure sent to getNextAddress in order to compute a Ionio account address
export type ArtifactWithConstructorArgs = {
  artifact: Artifact;
  args: { [name: string]: Argument };
};

export type IonioScriptDetails = ScriptDetails & ArtifactWithConstructorArgs;

export function isIonioScriptDetails(script: ScriptDetails): script is IonioScriptDetails {
  return (script as IonioScriptDetails).artifact !== undefined;
}
