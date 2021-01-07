import { IError } from '../common';
import { Entity } from '../core/Entity';
import { UniqueEntityID } from '../core/UniqueEntityID';
import { WalletId } from './walletId';

export interface IWallets {
  wallets: IWallet[];
}

export interface IWallet {
  errors?: Record<string, IError>;
  masterXPub: string;
  masterBlindKey: string;
  encryptedMnemonic: string;
  restored?: boolean;
}

/**
 * Entity Wallet
 *
 * TODO: Should conform to Identity
 * https://github.com/TDex-network/tdex-sdk/blob/beta/src/identity.ts
 *
 * @member createWallet factory method to create wallet
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Wallet extends Entity<IWallet> {
  get walletId(): WalletId {
    return WalletId.create(this._id);
  }

  get masterXPub(): string {
    return this.masterXPub;
  }

  get masterBlindKey(): string {
    return this.masterBlindKey;
  }

  get encryptedMnemonic(): string {
    return this.encryptedMnemonic;
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
      masterXPub: props.masterXPub,
      masterBlindKey: props.masterBlindKey,
      encryptedMnemonic: props.encryptedMnemonic,
    };
    return new Wallet(walletProps, id);
  }
}
