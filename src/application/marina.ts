import { MarinaProvider, AddressInterface } from 'marina-provider';
import WindowProxy from './proxy';

export default class Marina extends WindowProxy implements MarinaProvider {
  enable(): Promise<void> {
    return this.proxy(this.enable.name, []);
  }

  disable(): Promise<void> {
    return this.proxy(this.disable.name, []);
  }

  isEnabled(): Promise<boolean> {
    return this.proxy(this.isEnabled.name, []);
  }

  getNetwork(): Promise<'liquid' | 'regtest'> {
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

  blindTransaction(psetBase64: string): Promise<string> {
    return this.proxy(this.blindTransaction.name, [psetBase64]);
  }

  sendTransaction(
    recipientAddress: string,
    amountInSatoshis: number,
    assetHash: string
  ): Promise<string> {
    return this.proxy(this.sendTransaction.name, [recipientAddress, amountInSatoshis, assetHash]);
  }

  signTransaction(psetBase64: string): Promise<string> {
    return this.proxy(this.signTransaction.name, [psetBase64]);
  }
}
