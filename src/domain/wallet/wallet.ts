import { UtxoInterface } from 'ldk';
import { IError } from '../common';
import { Entity } from '../core/Entity';
import { UniqueEntityID } from '../core/UniqueEntityID';
import {
  Address,
  EncryptedMnemonic,
  MasterXPub,
  MasterBlindingKey,
  PasswordHash,
} from './value-objects';
import { Transaction } from './value-objects/transaction';
import { WalletId } from './walletId';

export interface IWallets {
  wallets: IWallet[];
}

export interface IWallet {
  confidentialAddresses: Address[];
  encryptedMnemonic: EncryptedMnemonic;
  errors?: Record<string, IError>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
  passwordHash: PasswordHash;
  pendingTx?: Transaction;
  restored?: boolean;
  utxoMap: Map<string, UtxoInterface>;
}

/**
 * Entity Wallet
 *
 * @member createWallet factory method to create wallet
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Wallet extends Entity<IWallet> {
  get walletId(): WalletId {
    return WalletId.create(this._id);
  }

  get masterXPub(): MasterXPub {
    return this.props.masterXPub;
  }

  get masterBlindingKey(): MasterBlindingKey {
    return this.props.masterBlindingKey;
  }

  get encryptedMnemonic(): EncryptedMnemonic {
    return this.props.encryptedMnemonic;
  }

  get passwordHash(): PasswordHash {
    return this.props.passwordHash;
  }

  get confidentialAddresses(): Address[] {
    return this.props.confidentialAddresses;
  }

  get pendingTx(): Transaction | undefined {
    return this.props.pendingTx;
  }

  get utxoMap(): Map<string, UtxoInterface> {
    return this.props.utxoMap;
  }

  /**
   * @param props - Wallet props
   * @param id - When the id is known we can pass it in, or we create one
   */
  private constructor(props: IWallet, id?: UniqueEntityID) {
    super(props, id);
  }

  /**
   * Create a wallet.
   *
   * @remarks
   * Factory Method that handles creation of the Wallet entity.
   *
   * @param props - The wallet props
   * @param id - A unique identifier
   * @returns A Liquid wallet
   */
  public static createWallet(props: IWallet, id?: UniqueEntityID): Wallet {
    const walletProps = {
      confidentialAddresses: props.confidentialAddresses,
      encryptedMnemonic: props.encryptedMnemonic,
      masterBlindingKey: props.masterBlindingKey,
      masterXPub: props.masterXPub,
      passwordHash: props.passwordHash,
      pendingTx: props.pendingTx,
      utxoMap: props.utxoMap,
    };
    return new Wallet(walletProps, id);
  }
}
