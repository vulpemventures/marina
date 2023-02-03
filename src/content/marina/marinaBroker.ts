import type { BrokerOption } from '../broker';
import Broker from '../broker';
import type { MessageHandler } from '../../domain/message';
import { newErrorResponseMessage, newSuccessResponseMessage } from '../../domain/message';
import Marina from '../../inject/marina/provider';
import { MainAccount, MainAccountLegacy, MainAccountTest } from '../../domain/account-type';
import type {
  AppRepository,
  AssetRepository,
  PopupsRepository,
  TaxiRepository,
  WalletRepository,
} from '../../infrastructure/repository';
import { WalletStorageAPI } from '../../infrastructure/storage/wallet-repository';
import { AppStorageAPI } from '../../infrastructure/storage/app-repository';
import type { SignTransactionPopupResponse } from '../../extension/popups/sign-pset';
import type { SignMessagePopupResponse } from '../../extension/popups/sign-msg';
import { computeBalances } from '../../utils';
import type { TxDetails, UnblindedOutput } from '../../domain/transaction';
import { AssetStorageAPI } from '../../infrastructure/storage/asset-repository';
import { TaxiStorageAPI } from '../../infrastructure/storage/taxi-repository';
import { networks } from 'liquidjs-lib';
import { PopupsStorageAPI } from '../../infrastructure/storage/popups-repository';
import type {
  EnabledMarinaEvent,
  MarinaEvent,
  NetworkMarinaEvent,
  NewTxMarinaEvent,
  NewUtxoMarinaEvent,
  SpentUtxoMarinaEvent,
} from '../marina-event';
import { stringify } from '../../browser-storage-converters';
import type { Account } from '../../domain/account';
import { AccountFactory } from '../../domain/account';
import type { AddressRecipient, DataRecipient, NetworkString, Recipient } from 'marina-provider';
import { isAddressRecipient, isDataRecipient } from 'marina-provider';
import type { SpendPopupResponse } from '../../extension/popups/spend';

export default class MarinaBroker extends Broker<keyof Marina> {
  private static NotSetUpError = new Error('proxy store and/or cache are not set up');
  private hostname: string;
  private network: NetworkString = 'liquid';
  private selectedAccount = MainAccount;
  private walletRepository: WalletRepository;
  private appRepository: AppRepository;
  private assetRepository: AssetRepository;
  private taxiRepository: TaxiRepository;
  private popupsRepository: PopupsRepository;

  static Start(hostname?: string) {
    const broker = new MarinaBroker(hostname);
    broker.start();
  }

  private constructor(hostname = '', brokerOpts?: BrokerOption[]) {
    super(Marina.PROVIDER_NAME, brokerOpts);
    this.hostname = hostname;
    this.walletRepository = new WalletStorageAPI();
    this.appRepository = new AppStorageAPI();
    this.assetRepository = new AssetStorageAPI(this.walletRepository);
    this.taxiRepository = new TaxiStorageAPI(this.assetRepository, this.appRepository);
    this.popupsRepository = new PopupsStorageAPI();
  }

  private dispatchEventToProvider<T extends MarinaEvent<any>>(event: T) {
    window.dispatchEvent(
      new CustomEvent(`marina_event_${event.type.toLowerCase()}`, {
        detail: stringify(event.payload),
      })
    );
  }

  protected start() {
    super.start(this.marinaMessageHandler);
    // subscribe to repository events and map them to MarinaEvents
    // providers will catch these events when on/off are called
    this.appRepository.onHostnameEnabled((hostname) => {
      this.dispatchEventToProvider<EnabledMarinaEvent>({
        type: 'ENABLED',
        payload: { data: { hostname: hostname, network: 'liquid' } },
      });
      return Promise.resolve();
    });
    this.appRepository.onNetworkChanged((network) => {
      this.network = network;
      this.dispatchEventToProvider<NetworkMarinaEvent>({
        type: 'NETWORK',
        payload: { data: network },
      });
      return Promise.resolve();
    });
    this.walletRepository.onDeleteUtxo(this.network, (utxo) => {
      this.dispatchEventToProvider<SpentUtxoMarinaEvent>({
        type: 'SPENT_UTXO',
        payload: { data: utxo },
      });
      return Promise.resolve();
    });
    this.walletRepository.onNewUtxo(this.network, (utxo) => {
      this.dispatchEventToProvider<NewUtxoMarinaEvent>({
        type: 'NEW_UTXO',
        payload: { data: utxo },
      });
      return Promise.resolve();
    });
    this.walletRepository.onNewTransaction((ID: string, details: TxDetails) => {
      this.dispatchEventToProvider<NewTxMarinaEvent>({
        type: 'NEW_TX',
        payload: { data: { txID: ID, details } },
      });
      return Promise.resolve();
    });
  }
  // check if the current broker hostname is authorized
  private async checkHostnameAuthorization() {
    const enabledHostnames = await this.appRepository.getEnabledSites();
    if (enabledHostnames.includes(this.hostname))
      throw new Error('User must authorize the current website');
  }

  // check if the account is already in the wallet
  private async accountExists(name: string): Promise<boolean> {
    const accountsDetails = await this.walletRepository.getAccountDetails();
    return Object.keys(accountsDetails).some((account) => account === name);
  }

  // if ids is undefined, return the main account
  // if ids is empty, return an empty array
  private handleIdsParam(ids?: string[]): string[] {
    if (!ids) return [MainAccount, MainAccountLegacy, MainAccountTest];
    if (ids.length === 0) return [];
    return ids;
  }

  private async getSelectedAccount(): Promise<Account> {
    const network = await this.appRepository.getNetwork();
    if (network === null) throw new Error('network is not set up');
    const factory = await AccountFactory.create(this.walletRepository, this.appRepository);
    return factory.make(network, this.selectedAccount);
  }

  private marinaMessageHandler: MessageHandler<keyof Marina> = async ({ id, name, params }) => {
    if (!this.hostname) throw MarinaBroker.NotSetUpError;
    const successMsg = <T = any>(data?: T) => newSuccessResponseMessage(id, data);

    try {
      switch (name) {
        case 'getNetwork': {
          const network = await this.appRepository.getNetwork();
          return successMsg(network);
        }

        case 'isEnabled': {
          try {
            await this.checkHostnameAuthorization();
            return successMsg(true);
          } catch {
            return successMsg(false);
          }
        }

        case 'enable': {
          await this.popupsRepository.setHostnameToEnable(this.hostname);
          const accepted = await this.openAndWaitPopup<boolean>('enable');
          if (!accepted) throw new Error(`user rejected to enable ${this.hostname}`);
          return successMsg();
        }

        case 'disable': {
          await this.appRepository.disableSite(this.hostname);
          return successMsg();
        }

        case 'getAddresses': {
          await this.checkHostnameAuthorization();
          const accountNames = this.handleIdsParam(params ? params[0] : undefined);
          const network = await this.appRepository.getNetwork();
          if (network === null) throw new Error('network is not set up');
          const factory = await AccountFactory.create(this.walletRepository, this.appRepository);
          const accounts = await Promise.all(
            accountNames.map((name) => factory.make(network, name))
          );
          const addresses = await Promise.all(accounts.map((account) => account.getAllAddresses()));
          return successMsg(addresses.flat());
        }

        case 'getNextAddress': {
          await this.checkHostnameAuthorization();
          if (params && params.length > 0) {
            throw new Error('Only custom script accounts can expect construct parameters');
          }
          const account = await this.getSelectedAccount();
          const nextAddress = await account.getNextAddress(false);
          return successMsg(nextAddress);
        }

        case 'getNextChangeAddress': {
          await this.checkHostnameAuthorization();
          if (params && params.length > 0) {
            throw new Error('Only custom script accounts can expect construct parameters');
          }
          const account = await this.getSelectedAccount();
          const nextChangeAddress = await account.getNextAddress(true);
          return successMsg(nextChangeAddress);
        }

        case 'signTransaction': {
          await this.checkHostnameAuthorization();
          if (!params || params.length !== 1) {
            throw new Error('Missing params');
          }
          const [pset] = params;
          await this.popupsRepository.setPsetToSign(pset, this.hostname);
          const { accepted, signedPset } =
            await this.openAndWaitPopup<SignTransactionPopupResponse>('sign-pset');

          if (!accepted) throw new Error('User rejected the sign request');
          if (!signedPset) throw new Error('Something went wrong with tx signing');
          await this.popupsRepository.clear();

          return successMsg(signedPset);
        }

        case 'sendTransaction': {
          await this.checkHostnameAuthorization();
          const [recipients, feeAssetHash] = params as [Recipient[], string | undefined];
          const network = await this.appRepository.getNetwork();
          if (network === null) throw new Error('network is not set up');
          const lbtc = networks[network].assetHash;
          const feeAsset = feeAssetHash ? feeAssetHash : lbtc;
          const taxiAssets = await this.taxiRepository.getTaxiAssets(network);
          // validate if fee asset is valid
          if (![lbtc, ...taxiAssets].includes(feeAsset)) {
            throw new Error(`${feeAsset} not supported as fee asset.`);
          }

          // validate object recipient (asset and value)
          // - if no asset is present, assume lbtc for the current network
          // - value must be present, a safe integer and higher or equal to zero
          // - if value is for example 1.0, parseInt it to eliminate float
          for (const rcpt of recipients) {
            if (!rcpt.asset) {
              if (!lbtc) throw new Error('missing asset on recipient');
              rcpt.asset = lbtc;
            }
            if (!rcpt.value) throw new Error('missing value on recipient');
            if (!Number.isSafeInteger(rcpt.value)) throw new Error('invalid value on recipient');
            if (rcpt.value < 0) throw new Error('negative value on recipient');
            rcpt.value = parseInt(rcpt.value.toString(), 10);
          }

          const { addressRecipients, dataRecipients } = sortRecipients(recipients);

          await this.popupsRepository.setSpendParameters({
            hostname: this.hostname,
            addressRecipients,
            dataRecipients,
            feeAsset,
          });

          const { accepted, signedTxHex } = await this.openAndWaitPopup<SpendPopupResponse>(
            'spend'
          );

          if (!accepted) throw new Error('the user rejected the create tx request');
          if (!signedTxHex) throw new Error('something went wrong with the tx crafting');

          // try to broadcast the tx
          try {
            const chainSource = await this.appRepository.getChainSource();
            if (!chainSource) throw new Error('chain source is not set up, cannot broadcast');
            const txid = await chainSource.broadcastTransaction(signedTxHex);
            return successMsg({ txid, hex: signedTxHex });
          } catch (e) {
            console.warn('broadcasting failed, returning the signed tx hex', e);
            return successMsg({ txid: null, hex: signedTxHex });
          } finally {
            await this.popupsRepository.clear();
          }
        }

        case 'signMessage': {
          await this.checkHostnameAuthorization();
          const [message] = params as [string];
          await this.popupsRepository.setMessageToSign(message, this.hostname);
          const { accepted, signedMessage } = await this.openAndWaitPopup<SignMessagePopupResponse>(
            'sign-msg'
          );

          if (!accepted) throw new Error('user rejected the signMessage request');
          if (!signedMessage) throw new Error('something went wrong with message signing');
          await this.popupsRepository.clear();
          return successMsg(signedMessage);
        }

        case 'getTransactions': {
          await this.checkHostnameAuthorization();
          const network = await this.appRepository.getNetwork();
          if (!network) throw new Error('Network not set up');
          const transactions = await this.walletRepository.getTransactions(network);
          return successMsg(transactions);
        }

        case 'getCoins': {
          await this.checkHostnameAuthorization();
          const accountsIDs = this.handleIdsParam(params ? params[0] : undefined);
          const network = await this.appRepository.getNetwork();
          if (!network) throw new Error('Network not set up');
          const coins = await this.walletRepository.getUtxos(network, ...accountsIDs);
          const results = coins.map((unblindedOutput) => ({
            txid: unblindedOutput.txID,
            vout: unblindedOutput.vout,
            unblindData: unblindedOutput.blindingData,
          }));
          return successMsg(results);
        }

        case 'getBalances': {
          await this.checkHostnameAuthorization();
          const accountsIDs = this.handleIdsParam(params ? params[0] : undefined);
          const network = await this.appRepository.getNetwork();
          if (!network) throw new Error('Network not set up');
          const utxos = await this.walletRepository.getUtxos(network, ...accountsIDs);
          const onlyUnblinded = utxos.filter((utxo) => utxo.blindingData);
          const balances = computeBalances(onlyUnblinded as UnblindedOutput[]);

          const balancesResult = [];
          for (const [assetHash, amount] of Object.entries(balances)) {
            const asset = await this.assetRepository.getAsset(assetHash);
            balancesResult.push({ asset: asset ? asset : assetHash, amount });
          }
          return successMsg(balancesResult);
        }

        case 'isReady': {
          try {
            await this.appRepository.getNetwork();
            const { isAuthenticated, isOnboardingCompleted } = await this.appRepository.getStatus();
            return successMsg(isAuthenticated && isOnboardingCompleted);
          } catch {
            // catch error = not ready
            return successMsg(false);
          }
        }

        case 'getFeeAssets': {
          await this.checkHostnameAuthorization();
          const network = await this.appRepository.getNetwork();
          if (!network) throw new Error('Network not set up');
          const lbtcAsset = await this.assetRepository.getAsset(networks[network].assetHash);
          const taxiAssets = await this.taxiRepository.getTaxiAssets(network);
          return successMsg([lbtcAsset, ...taxiAssets]);
        }

        case 'getSelectedAccount': {
          await this.checkHostnameAuthorization();
          return successMsg(this.selectedAccount);
        }

        case 'useAccount': {
          await this.checkHostnameAuthorization();
          const [accountName] = params as [string];
          if (!this.accountExists(accountName)) {
            throw new Error(`Account ${accountName} not found`);
          }

          this.selectedAccount = accountName;
          return successMsg(true);
        }

        // case 'importTemplate': {
        //   await this.checkHostnameAuthorization();
        //   const accountData = this.state.wallet.accounts[this.selectedAccount];
        //   if (accountData.type !== AccountType.CustomScriptAccount) {
        //     throw new Error('Only custom script accounts can import templates');
        //   }

        //   let contract: Template | undefined;
        //   let changeContract: Template | undefined;
        //   if (params && params.length > 0) {
        //     if (!validateTemplate(params[0])) {
        //       throw new Error('Invalid template');
        //     }
        //     contract = params[0];

        //     if (params[1]) {
        //       if (!validateTemplate(params[1])) {
        //         throw new Error('Invalid change template');
        //       }
        //       changeContract = params[1];
        //     }
        //   }

        //   await this.store.dispatchAsync(
        //     setCustomScriptTemplate(
        //       this.selectedAccount,
        //       contract!.template,
        //       changeContract?.template
        //     )
        //   );

        //   const isFuncSpendable = (fn: ArtifactFunction) => {
        //     return (
        //       fn.functionInputs.length === 1 &&
        //       fn.functionInputs[0].type === PrimitiveType.Signature &&
        //       (!fn.require || fn.require.length === 0)
        //     );
        //   };

        //   const artifact: Artifact = JSON.parse(contract!.template);
        //   let isSpendableByMarina = artifact.functions.every(isFuncSpendable);

        //   if (isSpendableByMarina && changeContract) {
        //     const changeArtifact = JSON.parse(changeContract.template);
        //     isSpendableByMarina = changeArtifact.functions.every(isFuncSpendable);
        //   }

        //   await this.store.dispatchAsync(
        //     setIsSpendableByMarina(this.selectedAccount, isSpendableByMarina)
        //   );

        //   return successMsg(true);
        // }

        // case 'createAccount': {
        //   await this.checkHostnameAuthorization();
        //   const [accountName] = params as [string];
        //   if (this.accountExists(accountName)) {
        //     throw new Error(`Account ${accountName} already exists`);
        //   }

        //   await this.store.dispatchAsync(
        //     setCreateAccountData({
        //       namespace: accountName,
        //       hostname: this.hostname,
        //     })
        //   );

        //   const { accepted } = await this.openAndWaitPopup<CreateAccountPopupResponse>(
        //     'create-account'
        //   );
        //   if (!accepted) throw new Error('user rejected the create account request');

        //   return successMsg(accepted);
        // }

        case 'broadcastTransaction': {
          await this.checkHostnameAuthorization();
          const [signedTxHex] = params as [string];
          const network = await this.appRepository.getNetwork();
          if (!network) throw new Error('Network not set up');
          const chainSource = await this.appRepository.getChainSource(network);
          if (!chainSource) throw new Error('Chain source not set up');

          // broadcast tx
          const txid = await chainSource.broadcastTransaction(signedTxHex);
          if (!txid) throw new Error('something went wrong with the tx broadcasting');
          return successMsg({ txid, hex: signedTxHex });
        }

        case 'getAccountInfo': {
          await this.checkHostnameAuthorization();
          let [accountName] = params as [string];
          if (!accountName) accountName = MainAccount;

          if (!this.accountExists(accountName)) {
            throw new Error(`Account ${accountName} not found`);
          }

          const details = await this.walletRepository.getAccountDetails(accountName);
          return successMsg(details[accountName]);
        }

        case 'getAccountsIDs': {
          await this.checkHostnameAuthorization();
          const allDetails = await this.walletRepository.getAccountDetails();
          return successMsg(Object.keys(allDetails));
        }

        default:
          return newErrorResponseMessage(id, new Error('Method not implemented.'));
      }
    } catch (err) {
      if (err instanceof Error) return newErrorResponseMessage(id, err);
      else throw err;
    }
  };
}

function sortRecipients(recipients: Recipient[]): {
  dataRecipients: DataRecipient[];
  addressRecipients: AddressRecipient[];
} {
  const addressRecipients: AddressRecipient[] = [];
  const dataRecipients: DataRecipient[] = [];

  for (const recipient of recipients) {
    if (isDataRecipient(recipient)) {
      dataRecipients.push(recipient);
    } else if (isAddressRecipient(recipient)) {
      addressRecipients.push(recipient);
    }
  }

  return { dataRecipients, addressRecipients };
}
