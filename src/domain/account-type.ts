import type { NetworkString } from 'marina-provider';

export const MainAccountLegacy = 'mainAccountLegacy';
export const MainAccount = 'mainAccount';
export const MainAccountTest = 'mainAccountTest';

export interface AccountDetails {
  baseDerivationPath: string;
  masterPublicKey: string; // base58 encoded master key (xpub derived using baseDerivationPath)
  lastUsedIndexes: Record<NetworkString, { internal: number; external: number }>;
  accountNetworks: NetworkString[];
}

export interface ScriptDetails {
  network: NetworkString;
  accountName: string;
  derivationPath?: string;
  blindingPrivateKey?: string;
}
