import type { BrokerOption } from '../broker';
import Broker from '../broker';
import type { MessageHandler, ResponseMessage } from '../../domain/message';
import { newErrorResponseMessage, newSuccessResponseMessage } from '../../domain/message';
import Marina from '../../inject/marina/provider';
import type {
  AppRepository,
  AssetRepository,
  PopupsRepository,
  TaxiRepository,
  WalletRepository,
} from '../../domain/repository';
import { WalletStorageAPI } from '../../infrastructure/storage/wallet-repository';
import { AppStorageAPI } from '../../infrastructure/storage/app-repository';
import type { SignTransactionPopupResponse } from '../../extension/popups/sign-pset';
import type { SignMessagePopupResponse } from '../../extension/popups/sign-msg';
import type { TxDetails, UnblindedOutput } from '../../domain/transaction';
import { lockTransactionInputs, computeBalances } from '../../domain/transaction';
import { AssetStorageAPI } from '../../infrastructure/storage/asset-repository';
import { TaxiStorageAPI } from '../../infrastructure/storage/taxi-repository';
import { networks } from 'liquidjs-lib';
import { PopupsStorageAPI } from '../../infrastructure/storage/popups-repository';
import type {
  DisabledMarinaEvent,
  EnabledMarinaEvent,
  MarinaEvent,
  NetworkMarinaEvent,
  NewTxMarinaEvent,
  NewUtxoMarinaEvent,
  SpentUtxoMarinaEvent,
} from '../marina-event';
import { stringify } from '../../infrastructure/browser-storage-converters';
import type { Account } from '../../application/account';
import {
  MainAccount,
  MainAccountLegacy,
  MainAccountTest,
  AccountFactory,
} from '../../application/account';
import type {
  AccountID,
  Address,
  AddressRecipient,
  ArtifactWithConstructorArgs,
  DataRecipient,
  NetworkString,
  Recipient,
  ScriptDetails,
  Utxo,
} from 'marina-provider';
import { AccountType, isAddressRecipient, isDataRecipient } from 'marina-provider';
import type { SpendPopupResponse } from '../../extension/popups/spend';
import type { CreateAccountPopupResponse } from '../../extension/popups/create-account';
import { BlinderService } from '../../application/blinder';
import zkpLib from '@vulpemventures/secp256k1-zkp';
import { WalletRepositoryUnblinder } from '../../application/unblinder';

export default class MarinaBroker extends Broker<keyof Marina> {
  private static NotSetUpError = new Error('proxy store and/or cache are not set up');
  private hostname: string;
  private network: NetworkString = 'liquid';
  private selectedAccount: AccountID = MainAccount;
  private walletRepository: WalletRepository;
  private appRepository: AppRepository;
  private assetRepository: AssetRepository;
  private taxiRepository: TaxiRepository;
  private popupsRepository: PopupsRepository;

  static async Start(hostname: string) {
    const broker = new MarinaBroker(hostname);
    const network = await broker.appRepository.getNetwork();
    if (network) {
      broker.network = network;
      if (network !== 'liquid') {
        broker.selectedAccount = MainAccountTest;
      }
    }
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

  private async unblindedOutputToUtxo(coin: UnblindedOutput): Promise<Utxo> {
    const witnessUtxo = await this.walletRepository.getWitnessUtxo(coin.txID, coin.vout);
    let scriptDetails: ScriptDetails | undefined;

    if (witnessUtxo) {
      const script = witnessUtxo.script.toString('hex');
      const { [script]: details } = await this.walletRepository.getScriptDetails(
        witnessUtxo?.script.toString('hex')
      );
      scriptDetails = details;
    }
    return {
      txid: coin.txID,
      vout: coin.vout,
      blindingData: coin.blindingData,
      scriptDetails: scriptDetails,
      witnessUtxo: witnessUtxo,
    };
  }

  protected start() {
    super.start(this.marinaMessageHandler);
    // subscribe to repository events and map them to MarinaEvents
    // providers will catch these events when on/off are called
    this.appRepository.onHostnameEnabled(async (hostname) => {
      const net = (await this.appRepository.getNetwork()) || 'liquid';
      return this.dispatchEventToProvider<EnabledMarinaEvent>({
        type: 'ENABLED',
        payload: { data: { hostname: hostname, network: net } },
      });
    });
    this.appRepository.onHostnameDisabled(async (hostname) => {
      const net = (await this.appRepository.getNetwork()) || 'liquid';
      return this.dispatchEventToProvider<DisabledMarinaEvent>({
        type: 'DISABLED',
        payload: { data: { hostname: hostname, network: net } },
      });
    });
    this.appRepository.onNetworkChanged((network) => {
      this.network = network;
      return Promise.resolve(
        this.dispatchEventToProvider<NetworkMarinaEvent>({
          type: 'NETWORK',
          payload: { data: network },
        })
      );
    });
    this.walletRepository.onDeleteUtxo(this.network)(async (utxo) => {
      return this.dispatchEventToProvider<SpentUtxoMarinaEvent>({
        type: 'SPENT_UTXO',
        payload: { data: await this.unblindedOutputToUtxo(utxo) },
      });
    });
    this.walletRepository.onNewUtxo(this.network)(async (utxo) => {
      return this.dispatchEventToProvider<NewUtxoMarinaEvent>({
        type: 'NEW_UTXO',
        payload: { data: await this.unblindedOutputToUtxo(utxo) },
      });
    });
    this.walletRepository.onNewTransaction((ID: string, details: TxDetails) => {
      return Promise.resolve(
        this.dispatchEventToProvider<NewTxMarinaEvent>({
          type: 'NEW_TX',
          payload: { data: { txID: ID, details } },
        })
      );
    });
  }
  // check if the current broker hostname is authorized
  private async checkHostnameAuthorization() {
    const enabledHostnames = await this.appRepository.getEnabledSites();
    if (!enabledHostnames.includes(this.hostname))
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
    if (!network) throw new Error('network is not set up');
    const factory = await AccountFactory.create(this.walletRepository);
    return factory.make(network, this.selectedAccount);
  }

  private async getNextAddress(isInternal: boolean, params: any[]): Promise<Address> {
    const account = await this.getSelectedAccount();
    let nextAddress = undefined;

    switch (await account.getAccountType()) {
      case AccountType.P2WPKH: {
        nextAddress = await account.getNextAddress(isInternal);
        break;
      }
      case AccountType.Ionio: {
        if (!params || params.length < 1) {
          throw new Error('missing Artifact parameter');
        }
        const [artifactWithArgs] = params as [ArtifactWithConstructorArgs];
        nextAddress = await account.getNextAddress(isInternal, artifactWithArgs);
        break;
      }
      default:
        throw new Error('Unsupported account type');
    }

    return nextAddress;
  }

  private marinaMessageHandler: MessageHandler<keyof Marina> = async ({ id, name, params }) => {
    if (!this.hostname) throw MarinaBroker.NotSetUpError;
    const successMsg: (data?: any) => ResponseMessage = <T = any>(data?: T) =>
      newSuccessResponseMessage(id, data);

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
          const factory = await AccountFactory.create(this.walletRepository);
          const accounts = await Promise.all(
            accountNames.map((name) => factory.make(network, name))
          );
          const addresses = await Promise.all(accounts.map((account) => account.getAllAddresses()));
          return successMsg(addresses.flat());
        }

        case 'getNextAddress': {
          await this.checkHostnameAuthorization();
          const nextAddress = await this.getNextAddress(false, params || []);
          return successMsg(nextAddress);
        }

        case 'getNextChangeAddress': {
          await this.checkHostnameAuthorization();
          const nextAddress = await this.getNextAddress(true, params || []);
          return successMsg(nextAddress);
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

        case 'blindTransaction': {
          await this.checkHostnameAuthorization();
          if (!params || params.length !== 1) {
            throw new Error('Missing params');
          }
          const [pset] = params;
          const blinder = new BlinderService(this.walletRepository, await zkpLib());
          const blindedPset = await blinder.blindPset(pset);
          return successMsg(blindedPset);
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
            await Promise.allSettled([
              lockTransactionInputs(this.walletRepository, signedTxHex),
              this.walletRepository.updateTxDetails({
                [txid]: {
                  hex: signedTxHex,
                },
              }),
              this.walletRepository.addTransactions(network, txid),
            ]);
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
          const utxos: Utxo[] = [];
          const unblinder = new WalletRepositoryUnblinder(
            this.walletRepository,
            this.appRepository,
            this.assetRepository,
            await zkpLib()
          );
          for (const coin of coins) {
            const utxo = await this.unblindedOutputToUtxo(coin);
            // check if the coins need unblinding
            if (
              coin.blindingData ||
              !utxo.witnessUtxo ||
              !utxo.witnessUtxo.rangeProof ||
              !utxo.witnessUtxo.surjectionProof ||
              !(utxo.witnessUtxo.rangeProof.length > 0) ||
              !(utxo.witnessUtxo.surjectionProof.length > 0)
            ) {
              utxos.push(utxo);
              continue;
            }

            // if need unblinding, unblind, cache result, and add to the list
            const unblinded = (await unblinder.unblind(utxo.witnessUtxo)).at(0);
            if (unblinded instanceof Error || !unblinded) {
              console.warn('unblinding failed', unblinded);
              continue;
            }
            await this.walletRepository.updateOutpointBlindingData([
              [{ txID: utxo.txid, vout: utxo.vout }, unblinded],
            ]);
            utxo.blindingData = unblinded;
            utxos.push(utxo);
          }

          return successMsg(utxos);
        }

        case 'getBalances': {
          await this.checkHostnameAuthorization();
          const accountsIDs = this.handleIdsParam(params ? params[0] : undefined);
          const network = await this.appRepository.getNetwork();
          if (!network) throw new Error('Network not set up');
          const utxos = await this.walletRepository.getUtxos(network, ...accountsIDs);
          const onlyUnblinded = utxos.filter((utxo) => utxo.blindingData);
          const balances = computeBalances(onlyUnblinded);

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
          if (!(await this.accountExists(accountName))) {
            throw new Error(`Account ${accountName} not found`);
          }

          this.selectedAccount = accountName;
          return successMsg(true);
        }

        case 'createAccount': {
          await this.checkHostnameAuthorization();
          const [name, accountType] = params as [string, AccountType];

          await this.popupsRepository.setCreateAccountParameters({
            hostname: this.hostname,
            name,
            accountType: accountType || AccountType.Ionio,
          });

          const { accepted } = await this.openAndWaitPopup<CreateAccountPopupResponse>(
            'create-account'
          );
          if (!accepted) throw new Error('user rejected the create account request');

          return successMsg(accepted);
        }

        case 'broadcastTransaction': {
          await this.checkHostnameAuthorization();
          const [signedTxHex] = params as [string];
          const network = await this.appRepository.getNetwork();
          if (!network) throw new Error('Network not set up');
          const chainSource = await this.appRepository.getChainSource(network);
          if (!chainSource) throw new Error('Chain source not set up');

          // broadcast tx
          const txid = await chainSource.broadcastTransaction(signedTxHex);
          await Promise.allSettled([
            lockTransactionInputs(this.walletRepository, signedTxHex),
            this.walletRepository.updateTxDetails({
              [txid]: {
                hex: signedTxHex,
              },
            }),
            this.walletRepository.addTransactions(network, txid),
          ]);
          if (!txid) throw new Error('something went wrong with the tx broadcasting');
          return successMsg({ txid, hex: signedTxHex });
        }

        case 'getAccountInfo': {
          await this.checkHostnameAuthorization();
          let [accountName] = params as [string];
          if (!accountName) accountName = MainAccount;

          if (!(await this.accountExists(accountName))) {
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
      console.error(err);
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
