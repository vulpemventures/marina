import { AddressInterface, UtxoInterface } from 'ldk';
import { AssetAmount } from '../../domain/connect';
import WindowProxy from '../proxy';
import { Transaction, Balance, Recipient, TransactionHex, PsetBase64 } from 'marina-provider';

export default class CoinosProvider extends WindowProxy {
  static PROVIDER_NAME = 'coinos';

  constructor() {
    super(CoinosProvider.PROVIDER_NAME);
  }

  // returns the list of unspents owned by the restricted asset account
  getCoins(): Promise<UtxoInterface[]> {
    return this.proxy(this.getCoins.name, []);
  }

  getTransactions(): Promise<Transaction[]> {
    return this.proxy(this.getTransactions.name, []);
  }

  getBalances(): Promise<Balance[]> {
    return this.proxy(this.getBalances.name, []);
  }

  getNextAddress(): Promise<AddressInterface> {
    return this.proxy(this.getNextAddress.name, []);
  }

  getNextChangeAddress(): Promise<AddressInterface> {
    return this.proxy(this.getNextChangeAddress.name, []);
  }

  getNetwork(): Promise<'liquid' | 'regtest' | 'testnet'> {
    return this.proxy(this.getNetwork.name, []);
  }

  sendTransaction(recipients: Recipient[], feeAsset?: string): Promise<TransactionHex> {
    return this.proxy(this.sendTransaction.name, [recipients, feeAsset]);
  }

  signTransaction(pset: PsetBase64): Promise<PsetBase64> {
    return this.proxy(this.signTransaction.name, [pset]);
  }

  // returns a signed pset with input = (txid, vout) (signed with SIGHASH_NONE)
  approveSpend(toAllow: AssetAmount[]): Promise<string> {
    return this.proxy(this.approveSpend.name, [toAllow]);
  }
}
