import { v4 as uuidv4 } from 'uuid';
import { Identifier } from './Identifier';

export class UniqueEntityID extends Identifier<string | number> {
  constructor(id?: string | number) {
    super(id ? id : uuidv4());
  }
}
