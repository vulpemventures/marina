import { IdentityRestorerInterface } from 'ldk';

export default class IdentityRestorerFromState implements IdentityRestorerInterface {
  private addresses: string[];

  constructor(addresses: string[]) {
    this.addresses = addresses;
  }

  async addressHasBeenUsed(address: string): Promise<boolean> {
    return Promise.resolve(this.addresses.includes(address));
  }

  async addressesHaveBeenUsed(addresses: string[]): Promise<boolean[]> {
    return Promise.all(addresses.map((addr) => this.addressHasBeenUsed(addr)));
  }
}
