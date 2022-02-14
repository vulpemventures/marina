import {
  AddressInterface,
  Balance,
  MarinaEventType,
  MarinaProvider,
  PsetBase64,
  Recipient,
  SignedMessage,
  Transaction,
  TransactionID,
  Utxo,
} from 'marina-provider';
import MarinaEventHandler from './marinaEventHandler';
import WindowProxy from '../proxy';

export default class Marina extends WindowProxy implements MarinaProvider {
  static PROVIDER_NAME = 'marina';

  private eventHandler: MarinaEventHandler;

  constructor() {
    super(Marina.PROVIDER_NAME);
    this.eventHandler = new MarinaEventHandler();
  }

  enable(): Promise<void> {
    return this.proxy(this.enable.name, []);
  }

  disable(): Promise<void> {
    return this.proxy(this.disable.name, []);
  }

  isEnabled(): Promise<boolean> {
    return this.proxy(this.isEnabled.name, []);
  }

  getNetwork(): Promise<'liquid' | 'regtest' | 'testnet'> {
    return this.proxy(this.getNetwork.name, []);
  }

  getAddresses(): Promise<AddressInterface[]> {
    return this.proxy(this.getAddresses.name, []);
  }

  getNextAddress(): Promise<AddressInterface> {
    return this.proxy(this.getNextAddress.name, []);
  }

  getNextChangeAddress(): Promise<AddressInterface> {
    return this.proxy(this.getNextChangeAddress.name, []);
  }

  setAccount(account: number): Promise<void> {
    throw new Error('Method not implemented.');
  }

  blindTransaction(psetBase64: PsetBase64): Promise<PsetBase64> {
    if (!psetBase64 || typeof psetBase64 !== 'string') {
      throw new Error('you must specify a pset to blind (base64 encoded)');
    }

    return this.proxy(this.blindTransaction.name, [psetBase64]);
  }

  sendTransaction(recipients: Recipient[], feeAssetHash?: string): Promise<TransactionID> {
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('invalid recipients array');
    }

    return this.proxy(this.sendTransaction.name, [recipients, feeAssetHash]);
  }

  signTransaction(psetBase64: PsetBase64): Promise<PsetBase64> {
    if (!psetBase64 || typeof psetBase64 !== 'string') {
      throw new Error('you must specify a pset to sign (base64 encoded)');
    }

    return this.proxy(this.signTransaction.name, [psetBase64]);
  }

  signMessage(message: string): Promise<SignedMessage> {
    if (!message || message.length === 0) {
      throw new Error('message cannot be empty');
    }
    return this.proxy(this.signMessage.name, [message]);
  }

  getCoins(): Promise<Utxo[]> {
    return this.proxy(this.getCoins.name, []);
  }

  getTransactions(): Promise<Transaction[]> {
    return this.proxy(this.getTransactions.name, []);
  }

  getBalances(): Promise<Balance[]> {
    return this.proxy(this.getBalances.name, []);
  }

  on(type: MarinaEventType, callback: (payload: any) => void) {
    return this.eventHandler.on(type, callback);
  }

  off(id: string) {
    if (!id) throw new Error('you must specify an id');

    this.eventHandler.off(id);
  }

  isReady(): Promise<boolean> {
    return this.proxy(this.isReady.name, []);
  }

  getFeeAssets(): Promise<string[]> {
    return this.proxy(this.getFeeAssets.name, []);
  }

  reloadCoins(): Promise<void> {
    return this.proxy(this.reloadCoins.name, []);
  }
}
