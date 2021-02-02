import { fromXpub, IdentityRestorerInterface, IdentityType, MasterPublicKey, Mnemonic } from 'ldk';
import Identity, { IdentityInterface } from 'ldk/dist/identity/identity';
import { Address } from '../../domain/wallet/value-objects';
import { IWallet } from '../../domain/wallet/wallet';

export async function nextAddressForWallet(
  wallet: IWallet,
  chain: string,
  change: boolean
): Promise<string> {
  const { confidentialAddresses, masterBlindingKey, masterXPub } = wallet;
  const restorer = new IdentityRestorerFromState(confidentialAddresses.map((addr) => addr.value));
  // Restore wallet from MasterPublicKey
  const pubKeyWallet = new MasterPublicKey({
    chain,
    restorer,
    type: IdentityType.MasterPublicKey,
    value: {
      masterPublicKey: fromXpub(masterXPub.value, chain),
      masterBlindingKey: masterBlindingKey.value,
    },
    initializeFromRestorer: true,
  });
  const isRestored = await pubKeyWallet.isRestored;
  if (!isRestored) {
    throw new Error('Failed to restore wallet');
  }

  let nextAddress: string;
  if (change) {
    nextAddress = pubKeyWallet.getNextChangeAddress().confidentialAddress;
  } else {
    nextAddress = pubKeyWallet.getNextAddress().confidentialAddress;
  }

  return nextAddress;
}

export async function walletFromAddresses(
  mnemonic: string,
  addresses: Address[],
  chain: string
): Promise<IdentityInterface> {
  const restorer = new IdentityRestorerFromState(addresses.map((addr) => addr.value));
  const mnemonicWallet = new Mnemonic({
    chain,
    restorer,
    type: IdentityType.Mnemonic,
    value: { mnemonic },
    initializeFromRestorer: true,
  });
  const isRestored = await mnemonicWallet.isRestored;
  if (!isRestored) {
    throw new Error('Failed to restore wallet');
  }
  return mnemonicWallet;
}

class IdentityRestorerFromState implements IdentityRestorerInterface {
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
