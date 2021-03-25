import { UtxoInterface } from 'ldk';
import { Address } from './value-objects';
import { Transaction } from './value-objects/transaction';
import { IWallet, Wallet } from './wallet';

export interface IWalletRepository {
  init(wallets: Wallet[]): Promise<void>;
  getOrCreateWallet(wallet?: IWallet): Promise<Wallet>;
  addDerivedAddress(address: Address): Promise<void>;
  setPendingTx(tx?: Transaction): Promise<void>;
  setUtxos(utxoMap: Map<string, UtxoInterface>): Promise<void>;
  getUtxos(): Promise<Map<string, UtxoInterface>>;
}
