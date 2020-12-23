import { UniqueEntityID } from '../core/UniqueEntityID';
import { Entity } from '../core/Entity';

export class WalletId extends Entity<unknown> {
  get id(): UniqueEntityID {
    return this._id;
  }

  private constructor(id?: UniqueEntityID) {
    super(null, id);
  }

  public static create(id?: UniqueEntityID): WalletId {
    return new WalletId(id);
  }
}
