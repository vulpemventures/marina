import { StateRestorerOpts, Mnemonic, IdentityType, mnemonicRestorerFromState } from 'ldk';
import { Address } from '../../domain/address';

export function getStateRestorerOptsFromAddresses(addresses: Address[]): StateRestorerOpts {
  const derivationPaths = addresses.map((addr) => addr.derivationPath);

  const indexes = [];
  const changeIndexes = [];

  for (const path of derivationPaths) {
    if (!path) continue;
    const splitted = path.split('/');
    const isChange = splitted[splitted.length - 2] === '1';
    const index = parseInt(splitted[splitted.length - 1]);

    if (isChange) {
      changeIndexes.push(index);
      continue;
    }

    indexes.push(index);
  }

  return {
    lastUsedExternalIndex: Math.max(...indexes),
    lastUsedInternalIndex: Math.max(...changeIndexes),
  };
}

export function mnemonicWalletFromAddresses(
  mnemonic: string,
  addresses: Address[],
  chain: string
): Promise<Mnemonic> {
  const mnemonicWallet = new Mnemonic({
    chain,
    type: IdentityType.Mnemonic,
    opts: { mnemonic },
  });

  const optsRestorer = getStateRestorerOptsFromAddresses(addresses);
  return mnemonicRestorerFromState(mnemonicWallet)(optsRestorer);
}
