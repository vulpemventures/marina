import { Outpoint, UtxoInterface } from 'ldk';
import { Address } from './value-objects';
import { Transaction } from './value-objects/transaction';
import { IWallet, Wallet } from './wallet';

export interface IWalletRepository {
  init(wallets: Wallet[]): Promise<void>;
  getOrCreateWallet(wallet?: IWallet): Promise<Wallet>;
  addDerivedAddress(address: Address): Promise<void>;
  setPendingTx(tx?: Transaction): Promise<void>;
  setUtxos(utxoMap: Map<Outpoint, UtxoInterface>): Promise<void>;
}
