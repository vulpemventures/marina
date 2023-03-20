import type {
  AccountID,
  Balance,
  MarinaEventType,
  MarinaProvider,
  PsetBase64,
  Recipient,
  SentTransaction,
  SignedMessage,
  Transaction,
  Utxo,
  AccountInfo,
  Address,
  ArtifactWithConstructorArgs,
  AccountType,
} from 'marina-provider';
import MarinaEventHandler from './marinaEventHandler';
import WindowProxy from '../proxy';

export default class Marina extends WindowProxy<keyof MarinaProvider> implements MarinaProvider {
  static PROVIDER_NAME = 'marina';

  private eventHandler: MarinaEventHandler;

  constructor() {
    super(Marina.PROVIDER_NAME);
    this.eventHandler = new MarinaEventHandler();
  }

  createAccount(accountID: string, accountType: AccountType): Promise<void> {
    return this.proxy('createAccount', [accountID, accountType]);
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

  getAddresses(ids?: AccountID[]): Promise<Address[]> {
    return this.proxy('getAddresses', [ids]);
  }

  getNextAddress(ionioData?: ArtifactWithConstructorArgs): Promise<Address> {
    if (ionioData) {
      return this.proxy('getNextAddress', [ionioData]);
    }
    return this.proxy('getNextAddress', []);
  }

  getNextChangeAddress(ionioData?: ArtifactWithConstructorArgs): Promise<Address> {
    if (ionioData) {
      return this.proxy('getNextChangeAddress', [ionioData]);
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

  signMessage(message: string): Promise<SignedMessage> {
    if (!message || message.length === 0) {
      throw new Error('message cannot be empty');
    }
    return this.proxy('signMessage', [message]);
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

  broadcastTransaction(signedTxHex: string): Promise<SentTransaction> {
    return this.proxy('broadcastTransaction', [signedTxHex]);
  }
}
