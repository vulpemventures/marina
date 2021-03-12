import { AddressInterface } from "ldk";


export interface LiquidProvider {
  isEnabled: Promise<boolean>;
  currentNetwork: Promise<'liquid' | 'regtest'>;

  enable(): Promise<void>;
  disable(): Promise<void>;

  getAddresses(): Promise<Record<number, AddressInterface[]>>;
  getNextAddress(account?: number): Promise<AddressInterface>;
  getNextChangeAddress(account?: number): Promise<AddressInterface>;

  sendTransaction(recipientAddress: string, amountInSatoshis: number, assetHash: string): Promise<string>;
  signTransaction(psetBase64: string): Promise<string>;
};


export default class Marina {
  foo() {
    return "bar";
  }
}

