import {
  fromXpub,
  IdentityInterface,
  IdentityRestorerInterface,
  IdentityType,
  MasterPublicKey,
} from 'ldk';
import { Address } from '../../domain/wallet/value-objects';

export async function xpubWalletFromAddresses(
  masterXPub: string,
  masterBlindingKey: string,
  addresses: Address[],
  chain: string
): Promise<IdentityInterface> {
  const restorer = new IdentityRestorerFromState(addresses.map((addr) => addr.value));
  const xpubWallet = new MasterPublicKey({
    chain,
    restorer,
    type: IdentityType.MasterPublicKey,
    value: {
      masterPublicKey: fromXpub(masterXPub, chain),
      masterBlindingKey,
    },
    initializeFromRestorer: true,
  });
  const isRestored = await xpubWallet.isRestored;
  if (!isRestored) {
    throw new Error('Failed to restore wallet');
  }
  return xpubWallet;
}

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
