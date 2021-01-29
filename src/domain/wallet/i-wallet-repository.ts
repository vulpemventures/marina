import { UtxoInterface } from 'ldk';
import { Address } from './value-objects';
import { IWallet, Wallet } from './wallet';

export interface IWalletRepository {
  init(wallets: Wallet[]): Promise<void>;
  getOrCreateWallet(wallet?: IWallet): Promise<Wallet>;
  addDerivedAddress(address: Address): Promise<void>;
  updateUtxos(newUtxos: UtxoInterface[]): Promise<void>;
}
