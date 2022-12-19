import type {
  AccountID,
  AddressInterface,
  Balance,
  Template,
  MarinaEventType,
  MarinaProvider,
  PsetBase64,
  Recipient,
  SentTransaction,
  SignedMessage,
  Transaction,
  Utxo,
  AccountInfo,
} from 'marina-provider';
import MarinaEventHandler from './marinaEventHandler';
import WindowProxy from '../proxy';

export default class Marina extends WindowProxy<keyof MarinaProvider> {
  static PROVIDER_NAME = 'marina';

  private eventHandler: MarinaEventHandler;

  constructor() {
    super(Marina.PROVIDER_NAME);
    this.eventHandler = new MarinaEventHandler();
  }

  getAccountsIDs(): Promise<string[]> {
    return this.proxy('getAccountsIDs', []);
  }

  getAccountInfo(accountID: AccountID): Promise<AccountInfo> {
    return this.proxy('getAccountInfo', [accountID]);
  }

  getSelectedAccount(): Promise<string> {
    return this.proxy('getSelectedAccount', []);
  }

  createAccount(accountName: string): Promise<void> {
    return this.proxy('createAccount', [accountName]);
  }

  importTemplate(template: Template, changeTemplate?: Template) {
    return this.proxy('importTemplate', [template, changeTemplate]);
  }

  enable(): Promise<void> {
    return this.proxy('enable', []);
  }

  disable(): Promise<void> {
    return this.proxy('disable', []);
  }

  isEnabled(): Promise<boolean> {
    return this.proxy('isEnabled', []);
  }

  getNetwork(): Promise<'liquid' | 'regtest' | 'testnet'> {
    return this.proxy('getNetwork', []);
  }

  getAddresses(ids?: AccountID[]): Promise<AddressInterface[]> {
    return this.proxy('getAddresses', [ids]);
  }

  getNextAddress(params?: any): Promise<AddressInterface> {
    if (params) {
      return this.proxy('getNextAddress', [params]);
    }
    return this.proxy('getNextAddress', []);
  }

  getNextChangeAddress(params?: any): Promise<AddressInterface> {
    if (params) {
      return this.proxy('getNextChangeAddress', [params]);
    }
    return this.proxy('getNextChangeAddress', []);
  }

  useAccount(account: AccountID): Promise<boolean> {
    return this.proxy('useAccount', [account]);
  }

  blindTransaction(psetBase64: PsetBase64): Promise<PsetBase64> {
    if (!psetBase64 || typeof psetBase64 !== 'string') {
      throw new Error('you must specify a pset to blind (base64 encoded)');
    }

    return this.proxy('blindTransaction', [psetBase64]);
  }

  sendTransaction(recipients: Recipient[], feeAssetHash?: string): Promise<SentTransaction> {
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('invalid recipients array');
    }

    return this.proxy('sendTransaction', [recipients, feeAssetHash]);
  }

  signTransaction(psetBase64: PsetBase64): Promise<PsetBase64> {
    if (!psetBase64 || typeof psetBase64 !== 'string') {
      throw new Error('you must specify a pset to sign (base64 encoded)');
    }

    return this.proxy('signTransaction', [psetBase64]);
  }

  signMessage(message: string, index: number): Promise<SignedMessage> {
    if (!message || message.length === 0) {
      throw new Error('message cannot be empty');
    }
    return this.proxy('signMessage', [message, index]);
  }

  getCoins(ids?: AccountID[]): Promise<Utxo[]> {
    return this.proxy('getCoins', [ids]);
  }

  getTransactions(ids?: AccountID[]): Promise<Transaction[]> {
    return this.proxy('getTransactions', [ids]);
  }

  getBalances(ids?: AccountID[]): Promise<Balance[]> {
    return this.proxy('getBalances', [ids]);
  }

  on(type: MarinaEventType, callback: (payload: any) => void) {
    return this.eventHandler.on(type, callback);
  }

  off(id: string) {
    if (!id) throw new Error('you must specify an id');

    this.eventHandler.off(id);
  }

  isReady(): Promise<boolean> {
    return this.proxy('isReady', []);
  }

  getFeeAssets(): Promise<string[]> {
    return this.proxy('getFeeAssets', []);
  }

  reloadCoins(ids?: AccountID[]): Promise<void> {
    return this.proxy('reloadCoins', [ids]);
  }

  broadcastTransaction(signedTxHex: string): Promise<SentTransaction> {
    return this.proxy('broadcastTransaction', [signedTxHex]);
  }
}
