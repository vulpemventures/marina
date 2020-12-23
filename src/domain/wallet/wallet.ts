import { Entity } from '../core/Entity';
import { UniqueEntityID } from '../core/UniqueEntityID';
import { WalletId } from './walletId';

export interface IWallets {
  wallets: IWallet[];
}

export interface IWallet {
  entropy: string;
  mnemonic: string[];
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

  get entropy(): string {
    return this.props.entropy;
  }

  get mnemonic(): string[] {
    return this.props.mnemonic;
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
      mnemonic: props.mnemonic,
      entropy: props.entropy,
    };
    return new Wallet(walletProps, id);
  }

  // TODO: Generate wallet from entropy/seed/...
  // public static generateWallet(props: IWallet['entropy'], id?: UniqueEntityID): Wallet {
  // derive addresses and everyhting from entropy
  // return new Wallet(walletProps, id);
  // }
}
