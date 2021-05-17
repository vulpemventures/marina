import { fromXpub, IdentityRestorerInterface, IdentityType, MasterPublicKey, Mnemonic } from 'ldk';
import { IdentityInterface } from 'ldk/dist/identity/identity';
import { Address, createAddress } from '../../domain/address';
import { IWallet } from '../../domain/wallet';

export async function nextAddressForWallet(
  wallet: IWallet,
  chain: string,
  change: boolean
): Promise<Address> {
  const { confidentialAddresses, masterBlindingKey, masterXPub } = wallet;
  const restorer = new IdentityRestorerFromState(confidentialAddresses.map((addr) => addr.value));
  // Restore wallet from MasterPublicKey
  const pubKeyWallet = new MasterPublicKey({
    chain,
    restorer,
    type: IdentityType.MasterPublicKey,
    value: {
      masterPublicKey: fromXpub(masterXPub, chain),
      masterBlindingKey: masterBlindingKey,
    },
    initializeFromRestorer: true,
  });
  const isRestored = await pubKeyWallet.isRestored;
  if (!isRestored) {
    throw new Error('Failed to restore wallet');
  }

  let nextAddress;
  if (change) {
    const { confidentialAddress, derivationPath } = await pubKeyWallet.getNextChangeAddress();
    nextAddress = {
      confidentialAddress: confidentialAddress,
      derivationPath: derivationPath,
    };
  } else {
    const { confidentialAddress, derivationPath } = await pubKeyWallet.getNextAddress();
    nextAddress = {
      confidentialAddress: confidentialAddress,
      derivationPath: derivationPath,
    };
  }

  return createAddress(nextAddress.confidentialAddress, nextAddress.derivationPath);
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

export class IdentityRestorerFromState implements IdentityRestorerInterface {
  private addresses: string[] = [];

  constructor(addresses: string[]) {
    this.addresses = addresses;
  }

  async addressHasBeenUsed(address: string): Promise<boolean> {
    if (this.addresses.length === 0) return false
    return this.addresses.includes(address);
  }

  async addressesHaveBeenUsed(addresses: string[]): Promise<boolean[]> {
    return Promise.all(addresses.map((addr) => this.addressHasBeenUsed(addr)));
  }
}
