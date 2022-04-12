import type {
  StateRestorerOpts,
  CosignerMultisig,
  XPub,
  AddressInterface,
  NetworkString,
} from 'ldk';
import {
  Mnemonic,
  IdentityType,
  mnemonicRestorerFromState,
  MasterPublicKey,
  masterPubKeyRestorerFromState,
  MultisigWatchOnly,
  restorerFromState,
} from 'ldk';
import type { MasterBlindingKey } from '../../domain/master-blinding-key';
import type { MasterXPub } from '../../domain/master-extended-pub';
import * as ecc from 'tiny-secp256k1';

export function getStateRestorerOptsFromAddresses(
  addresses: AddressInterface[]
): StateRestorerOpts {
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
  chain: NetworkString
): Promise<Mnemonic> {
  const mnemonicID = new Mnemonic({
    chain,
    ecclib: ecc,
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
  network: NetworkString
) {
  const xpub = newMasterPublicKey(masterXPub, masterBlindingKey, network);
  return masterPubKeyRestorerFromState(xpub)(restorerOpts);
}

export function newMasterPublicKey(
  masterXPub: MasterXPub,
  masterBlindingKey: MasterBlindingKey,
  network: NetworkString
) {
  return new MasterPublicKey({
    chain: network,
    type: IdentityType.MasterPublicKey,
    ecclib: ecc,
    opts: {
      masterPublicKey: masterXPub,
      masterBlindingKey: masterBlindingKey,
    },
  });
}

// create a MultisigWatchOnly Identity
// restore it using StateRestorerOpts
export function restoredWatchOnlyMultisig(
  signerXPub: XPub,
  cosigners: CosignerMultisig[],
  requiredSignatures: number,
  restorerOpts: StateRestorerOpts,
  network: NetworkString
) {
  const multisigID = newMultisigWatchOnly(network, requiredSignatures, cosigners, signerXPub);
  return restorerFromState<MultisigWatchOnly>(multisigID)(restorerOpts);
}

export function newMultisigWatchOnly(
  network: NetworkString,
  requiredSignatures: number,
  cosigners: CosignerMultisig[],
  signerXPub: XPub
) {
  return new MultisigWatchOnly({
    chain: network,
    type: IdentityType.MultisigWatchOnly,
    ecclib: ecc,
    opts: {
      requiredSignatures,
      cosigners: cosigners.concat([signerXPub]),
    },
  });
}
