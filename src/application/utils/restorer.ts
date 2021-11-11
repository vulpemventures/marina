import {
  StateRestorerOpts,
  Mnemonic,
  IdentityType,
  mnemonicRestorerFromState,
  MasterPublicKey,
  masterPubKeyRestorerFromState,
  CosignerMultisig,
  MultisigWatchOnly,
  XPub,
  HDSignerMultisig,
  restorerFromState,
  AddressInterface,
} from 'ldk';
import { Cosigner, MultisigWithCosigner } from '../../domain/cosigner';
import { MasterBlindingKey } from '../../domain/master-blinding-key';
import { MasterXPub } from '../../domain/master-extended-pub';
import { Network } from '../../domain/network';

export function getStateRestorerOptsFromAddresses(addresses: AddressInterface[]): StateRestorerOpts {
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
  const xpub = newMasterPublicKey(masterXPub, masterBlindingKey, network);
  return masterPubKeyRestorerFromState(xpub)(restorerOpts);
}

export function newMasterPublicKey(masterXPub: MasterXPub, masterBlindingKey: MasterBlindingKey, network: Network) {
  return new MasterPublicKey({
    chain: network,
    type: IdentityType.MasterPublicKey,
    opts: {
      masterPublicKey: masterXPub,
      masterBlindingKey: masterBlindingKey,
    },
  });
}

// create a Multisig Identity
// restore it using StateRestorerOpts
export function restoredMultisig(
  signer: HDSignerMultisig,
  cosigners: CosignerMultisig[],
  requiredSignatures: number,
  restorerOpts: StateRestorerOpts,
  cosigner: Cosigner,
  network: Network
) {
  const multisigID = new MultisigWithCosigner(
    {
      chain: network,
      type: IdentityType.Multisig,
      opts: {
        requiredSignatures,
        signer,
        cosigners,
      },
    },
    cosigner
  );

  return restorerFromState<MultisigWithCosigner>(multisigID)(restorerOpts);
}

// create a MultisigWatchOnly Identity
// restore it using StateRestorerOpts
export function restoredWatchOnlyMultisig(
  signerXPub: XPub,
  cosigners: CosignerMultisig[],
  requiredSignatures: number,
  restorerOpts: StateRestorerOpts,
  network: Network
) {
  const multisigID = newMultisigWatchOnly(network, requiredSignatures, cosigners, signerXPub);
  return restorerFromState<MultisigWatchOnly>(multisigID)(restorerOpts);
}

export function newMultisigWatchOnly(network: Network, requiredSignatures: number, cosigners: CosignerMultisig[], signerXPub: XPub) {
  return new MultisigWatchOnly({
    chain: network,
    type: IdentityType.MultisigWatchOnly,
    opts: {
      requiredSignatures,
      cosigners: cosigners.concat([signerXPub]),
    },
  });
}

