import { IdentityRestorerInterface, IdentityType, Mnemonic } from 'ldk';
import { IdentityInterface } from 'ldk/dist/identity/identity';
import { Address } from '../../domain/address';

export async function waitForRestoration(identity: IdentityInterface) {
  await identity.isRestored
}

export async function mnemonicWalletFromAddresses(
  mnemonic: string,
  masterBlindingKey: string,
  addresses: Address[],
  chain: string
): Promise<IdentityInterface> {
  const restorer = new IdentityRestorerFromState(addresses.map((addr) => addr.value));
  const mnemonicWallet = new Mnemonic({
    chain,
    restorer,
    type: IdentityType.Mnemonic,
    value: { mnemonic, masterBlindingKey },
    initializeFromRestorer: true,
  });
  const isRestored = await mnemonicWallet.isRestored;
  if (!isRestored) {
    throw new Error('Failed to restore wallet');
  }
  return mnemonicWallet;
}

export class IdentityRestorerFromState implements IdentityRestorerInterface {
  private addresses: string[] = [];

  constructor(addresses: string[]) {
    this.addresses = addresses;
  }

  addressHasBeenUsed(address: string): Promise<boolean> {
    if (this.addresses.length === 0) return Promise.resolve(false)
    return Promise.resolve(this.addresses.includes(address));
  }

  async addressesHaveBeenUsed(addresses: string[]): Promise<boolean[]> {
    return Promise.all(addresses.map((addr) => this.addressHasBeenUsed(addr)));
  }
}
