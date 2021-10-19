import {
  StateRestorerOpts,
  Mnemonic,
  IdentityType,
  mnemonicRestorerFromState,
  MasterPublicKey,
  masterPubKeyRestorerFromState,
  Multisig,
  CosignerMultisig,
  IdentityInterface,
  MultisigWatchOnly,
  XPub,
  HDSignerMultisig,
} from 'ldk';
import { Address } from '../../domain/address';
import { MasterBlindingKey } from '../../domain/master-blinding-key';
import { MasterXPub } from '../../domain/master-extended-pub';
import { Network } from '../../domain/network';

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

// create a Mnemonic Identity
// restore it from restorer's state
export function restoredMnemonic(
  mnemonic: string,
  restorerOpts: StateRestorerOpts,
  chain: Network
): Promise<Mnemonic> {
  const mnemonicID = new Mnemonic({
    chain,
    type: IdentityType.Mnemonic,
    opts: { mnemonic },
  });

  return mnemonicRestorerFromState(mnemonicID)(restorerOpts);
}

// create a MasterPublicKey Identity
// restore it using StateRestorerOpts
export function restoredMasterPublicKey(
  masterXPub: MasterXPub,
  masterBlindingKey: MasterBlindingKey,
  restorerOpts: StateRestorerOpts,
  network: Network
) {
  const xpub = new MasterPublicKey({
    chain: network,
    type: IdentityType.MasterPublicKey,
    opts: {
      masterPublicKey: masterXPub,
      masterBlindingKey: masterBlindingKey,
    },
  });

  return masterPubKeyRestorerFromState(xpub)(restorerOpts);
}


export function restoredMultisig(
  signer: HDSignerMultisig,
  cosigners: CosignerMultisig[],
  requiredSignatures: number,
  network: Network
) {
  const multisigID = new Multisig({
    chain: network,
    type: IdentityType.Multisig,
    opts: {
      requiredSignatures,
      signer,
      cosigners
    }
  });

  return restoreFrom(multisigID);
}

export function restoredWatchOnlyMultisig(
  signerXPub: XPub,
  cosigners: CosignerMultisig[],
  requiredSignatures: number,
  network: Network
) {
  const multisigID = new MultisigWatchOnly({
    chain: network,
    type: IdentityType.MultisigWatchOnly,
    opts: {
      requiredSignatures,
      cosigners: cosigners.concat([signerXPub])
    }
  });

  return restore(multisigID as IdentityInterface)
}
