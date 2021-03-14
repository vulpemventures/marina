import { ValueObject } from '../../core/ValueObject';
import { address, decodePset } from 'ldk';
import { Address } from './address';

export interface TransactionProps {
  [key: string]: any;
  value: string;
  sendAddress: string;
  sendAsset: string;
  sendAmount: number;
  feeAsset: string;
  feeAmount: number;
  changeAddress?: Address;
}

export interface TransactionDTO {
  value: string;
  sendAddress: string;
  sendAsset: string;
  sendAmount: number;
  feeAsset: string;
  feeAmount: number;
  changeAddress?: [address: string, derivationPath?: string];
}

export class Transaction extends ValueObject<TransactionProps> {
  get value(): string {
    return this.props.value;
  }

  get sendAddress(): string {
    return this.props.sendAddress;
  }

  get sendAsset(): string {
    return this.props.sendAsset;
  }

  get sendAmount(): number {
    return this.props.sendAmount;
  }

  get feeAsset(): string {
    return this.props.feeAsset;
  }

  get feeAmount(): number {
    return this.props.feeAmount;
  }

  get changeAddress(): Address | undefined {
    return this.props.changeAddress;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: TransactionProps) {
    super({
      value: props.value,
      sendAddress: props.sendAddress,
      sendAsset: props.sendAsset,
      sendAmount: props.sendAmount,
      feeAsset: props.feeAsset,
      feeAmount: props.feeAmount,
      changeAddress: props.changeAddress,
    });
  }

  private static isValidTx(tx: string): boolean {
    try {
      decodePset(tx);
      return true;
    } catch (ignore) {
      return false;
    }
  }

  private static isValidAddress(addr: string): boolean {
    try {
      address.toOutputScript(addr);
      return true;
    } catch (ignore) {
      return false;
    }
  }

  private static isValidAsset(asset: string): boolean {
    return asset.length === 64;
  }

  private static isValidAmount(amount: number): boolean {
    return amount > 0 && amount <= 2100000000000000;
  }

  public static create(props: TransactionProps): Transaction {
    if (
      !this.isValidTx(props.value) ||
      !this.isValidAddress(props.sendAddress) ||
      !this.isValidAsset(props.sendAsset) ||
      !this.isValidAmount(props.sendAmount) ||
      !this.isValidAsset(props.feeAsset) ||
      !this.isValidAmount(props.feeAmount)
    ) {
      throw new Error('Transaction must be a valid base64 encoded PSET');
    } else if (props.changeAddress && !this.isValidAddress(props.changeAddress.value)) {
      throw new Error('Transaction must be a valid base64 encoded PSET');
    } else {
      return new Transaction(props);
    }
  }
}
