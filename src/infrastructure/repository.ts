import type { UpdaterInput } from 'liquidjs-lib';
import type { AddressRecipient, DataRecipient, NetworkString } from 'marina-provider';
import type { AppStatus } from '../domain/app';
import type { ChainSource } from '../domain/chainsource';
import type { AccountDetails, ScriptDetails } from '../domain/account-type';
import type { Asset } from '../domain/asset';
import type {
  UnblindingData,
  CoinSelection,
  TxDetails,
  UnblindedOutput,
} from '../domain/transaction';
import Browser from 'webextension-polyfill';
import type { Encrypted } from '../encryption';

/**
 * The AppRepository stores the global application state like settings, network or explorer URLs.
 */
export interface AppRepository {
  getStatus(): Promise<AppStatus>;
  updateStatus(status: Partial<AppStatus>): Promise<void>;
  // returns the current selected network
  getNetwork(): MaybeNull<NetworkString>;
  setNetwork(network: NetworkString): Promise<void>;
  // returns the list of explorer URLs for the given network, use the selected network if undefined
  getWebExplorerURL(net?: NetworkString): MaybeNull<string>;
  setWebExplorerURL(net: NetworkString, url: string): Promise<void>;
  getWebsocketExplorerURL(net?: NetworkString): MaybeNull<string>;
  setWebsocketExplorerURLs(record: Partial<Record<NetworkString, string>>): Promise<void>;
  // returns the chainSource client for the given network, use the current selected network if undefined
  getChainSource(net?: NetworkString): MaybeNull<ChainSource>;
  // returns the list of websites that are allowed to use the extension
  getEnabledSites(): Promise<string[]>;
  enableSite(url: string): Promise<void>;
  disableSite(url: string): Promise<void>;
  // clear marina state (including wallet data)
  clear(): Promise<void>;

  onHostnameEnabled(callback: (websiteEnabled: string) => Promise<void>): void;
  onNetworkChanged(callback: (network: NetworkString) => Promise<void>): void;
}

type MaybeNull<T> = Promise<T | null>;

/**
 *  WalletRepository stores all the chain data (transactions, unspents, blinding data and accounts details)
 */
export interface WalletRepository {
  addTransactions(network: NetworkString, ...txIDs: string[]): Promise<void>;
  getTransactions(...network: NetworkString[]): Promise<string[]>;
  getUtxos(
    network: NetworkString,
    ...accountNames: string[]
  ): Promise<{ txID: string; vout: number; blindingData?: UnblindingData }[]>;
  selectUtxos(
    network: NetworkString,
    targets: { asset: string; amount: number }[],
    lock: boolean,
    ...onlyAccounts: string[]
  ): Promise<CoinSelection>;
  getOutputBlindingData(
    txID: string,
    vout: number
  ): Promise<{ txID: string; vout: number; blindingData?: UnblindingData } | undefined>;
  getWitnessUtxo(txID: string, vout: number): Promise<UpdaterInput['witnessUtxo']>;
  getScriptDetails(...scripts: string[]): Promise<Record<string, ScriptDetails>>;
  getTxDetails(...txIDs: string[]): Promise<Record<string, TxDetails>>;
  updateScriptDetails(scriptToDetails: Record<string, ScriptDetails>): Promise<void>;
  updateTxDetails(txIDtoDetails: Record<string, TxDetails>): Promise<void>;
  // updateScriptUnspents(scriptToUnspents: Record<string, ListUnspentResponse>): Promise<void>;
  updateOutpointBlindingData(
    outpointToBlindingData: Array<[{ txID: string; vout: number }, UnblindingData]>
  ): Promise<void>;

  getEncryptedMnemonic(): Promise<Encrypted | undefined>;
  getMasterBlindingKey(): Promise<string | undefined>;
  setSeedData(encryptedMnemonic: Encrypted, masterBlindingKey: string): Promise<void>;

  // account, if no names, returns all accounts
  getAccountDetails(...names: string[]): Promise<Record<string, AccountDetails>>;
  updateAccountDetails(name: string, details: Partial<AccountDetails>): Promise<void>;
  updateAccountLastUsedIndexes(
    name: string,
    network: NetworkString,
    indexes: Partial<{ internal: number; external: number }>
  ): Promise<void>;

  onNewTransaction(callback: (txID: string, tx: TxDetails) => Promise<void>): void;
  onNewUtxo(network: NetworkString, callback: (utxo: UnblindedOutput) => Promise<void>): void;
  onDeleteUtxo(network: NetworkString, callback: (utxo: UnblindedOutput) => Promise<void>): void;
}

// asset registry is a local cache of remote elements-registry
export interface AssetRepository {
  getAllAssets(network: NetworkString): Promise<Asset[]>;
  getAsset(assetHash: string): Promise<Asset | undefined>;
  // persist newly asset in the repository
  addAsset(assethash: string, asset: Asset): Promise<void>;
}

export type SpendParameters = {
  hostname: string;
  addressRecipients: AddressRecipient[];
  dataRecipients: DataRecipient[];
  feeAsset: string;
};

// store the data needed by the popups created by some of the provider calls
// it lets to communicate between the provider and the popup
export interface PopupsRepository {
  setHostnameToEnable(hostname: string): Promise<void>; // on "enable"
  setPsetToSign(psetBase64: string, hostname: string): Promise<void>; // on "signTransaction"
  setMessageToSign(message: string, hostname: string): Promise<void>; // on "signMessage"
  setSpendParameters(parameters: SpendParameters): Promise<void>; // on "sendTransaction"
  clear(): Promise<void>; // clear all data
}

export interface TaxiRepository {
  getTaxiURL(network: NetworkString): Promise<string>;
  setTaxiAssets(network: NetworkString, assets: string[]): Promise<void>;
  getTaxiAssets(network: NetworkString): Promise<(Asset | string)[]>;
}

// this repository is used to cache data during the onboarding flow
export interface OnboardingRepository {
  getOnboardingMnemonic(): Promise<string | undefined>;
  getOnboardingPassword(): Promise<string | undefined>;
  setOnboardingPasswordAndMnemonic(password: string, mnemonic: string): Promise<void>;
  setIsFromPopupFlow(mnemonicToBackup: string): Promise<void>;
  flush(): Promise<void>; // flush all data
}

export enum SendFlowStep {
  None,
  AssetSelected,
  AddressAmountFormDone,
  FeeFormDone,
}

// this repository is used to cache data during the UI send flow
export interface SendFlowRepository {
  reset(): Promise<void>; // reset all data in the send flow repository
  getSelectedAsset(): Promise<string | undefined>;
  setSelectedAsset(asset: string): Promise<void>;
  setReceiverAddressAmount(address: string, amount: number): Promise<void>;
  getReceiverAddress(): Promise<string | undefined>;
  getAmount(): Promise<number | undefined>;
  setUnsignedPset(pset: string): Promise<void>;
  getUnsignedPset(): Promise<string | undefined>;
  getStep(): Promise<SendFlowStep>;
}

export async function init(appRepository: AppRepository, sendFlowRepository: SendFlowRepository) {
  await Browser.storage.local.clear();
  await sendFlowRepository.reset();
  await appRepository.setNetwork('liquid');
}
