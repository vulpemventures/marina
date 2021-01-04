import { UniqueEntityID } from './UniqueEntityID';

const isEntity = (v: unknown): v is Entity<unknown> => {
  return v instanceof Entity;
};

/**
 * An object that is not defined by its attributes, but rather by a thread of continuity and its identity.
 * Entity has readonly props.
 */
export abstract class Entity<T> {
  protected readonly _id: UniqueEntityID;
  public readonly props: T;

  constructor(props: T, id?: UniqueEntityID) {
    this._id = id ? id : new UniqueEntityID();
    this.props = props;
  }

  public equals(object?: Entity<T>): boolean {
    // eslint-disable-next-line eqeqeq
    if (object == null || object == undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!isEntity(object)) {
      return false;
    }

    return this._id.equals(object._id);
  }
}
