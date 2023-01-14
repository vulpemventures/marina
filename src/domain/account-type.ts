import type { NetworkString } from 'marina-provider';

export const MainAccountName = 'mainAccount';

export interface AccountDetails {
  baseDerivationPath: string;
  masterPublicKey: string; // base58 encoded master key (xpub derived using baseDerivationPath)
  lastUsedInternalIndex: number;
  lastUsedExternalIndex: number;
  accountNetworks: NetworkString[];
}

export interface ScriptDetails {
  network: NetworkString;
  accountName: string;
  derivationPath?: string;
  blindingPrivateKey?: string;
}
