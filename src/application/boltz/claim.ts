import type { BIP174SigningData, OwnedInput } from 'liquidjs-lib';
import {
  Creator,
  Updater,
  Extractor,
  Finalizer,
  CreatorInput,
  Transaction,
  witnessStackToScriptWitness,
  Pset,
  ZKPValidator,
  ZKPGenerator,
  Blinder,
  AssetHash,
  Signer,
  script as bscript,
} from 'liquidjs-lib';
import type { AppRepository, WalletRepository } from '../../domain/repository';
import zkp from '@vulpemventures/secp256k1-zkp';
import type { Unspent } from '../../domain/chainsource';
import type { ECPairInterface } from 'ecpair';

/**
 * Claim swaps
 *
 * @param utxo
 * @param claimPublicKey
 * @param claimKeyPair
 * @param preimage
 * @param redeemScript
 * @param destinationScript the output script to which the funds should be sent
 * @param fee how many satoshis should be paid as fee
 * @param isRbf whether the transaction should signal full Replace-by-Fee
 * @param assetHash asset hash of Liquid asset
 * @param walletRepository
 * @param appRepository
 * @param password
 * @param blindingKey blinding public key for the output; undefined if the output should not be blinded
 * @param timeoutBlockHeight locktime of the transaction; only needed if the transaction is a refund
 */
export async function constructClaimTransaction(
  utxo: Unspent,
  claimPublicKey: Buffer,
  claimKeyPair: ECPairInterface,
  preimage: Buffer,
  redeemScript: Buffer,
  destinationScript: Buffer,
  fee: number,
  assetHash: string,
  walletRepository: WalletRepository,
  appRepository: AppRepository,
  password: string,
  isRbf = true,
  blindingKey?: Buffer,
  timeoutBlockHeight?: number
): Promise<Transaction> {
  const pset = Creator.newPset();
  const updater = new Updater(pset);

  pset.addInput(
    new CreatorInput(
      utxo.txid,
      utxo.vout,
      isRbf ? 0xfffffffd : 0xffffffff,
      timeoutBlockHeight
    ).toPartialInput()
  );
  updater.addInSighashType(0, Transaction.SIGHASH_ALL);
  updater.addInWitnessUtxo(0, utxo.witnessUtxo!);
  updater.addInWitnessScript(0, utxo.witnessUtxo!.script);

  updater.addOutputs([
    {
      script: destinationScript,
      blindingPublicKey: blindingKey,
      asset: assetHash,
      amount: (utxo.blindingData?.value ?? 0) - fee,
      blinderIndex: blindingKey !== undefined ? 0 : undefined,
    },
    {
      amount: fee,
      asset: assetHash,
    },
  ]);

  console.log('pset', pset);

  const blindedPset = await blindPset(pset, {
    index: 0,
    value: utxo.blindingData!.value.toString(),
    valueBlindingFactor: Buffer.from(utxo.blindingData!.valueBlindingFactor, 'hex'),
    asset: AssetHash.fromHex(utxo.blindingData!.asset).bytesWithoutPrefix,
    assetBlindingFactor: Buffer.from(utxo.blindingData!.assetBlindingFactor, 'hex'),
  });

  console.log('blindedPset', blindedPset);

  const signedPset = await signPset(blindedPset, claimPublicKey, claimKeyPair, preimage);

  console.log('signedPset', signedPset);

  const finalizer = new Finalizer(signedPset);
  finalizer.finalizeInput(0, () => {
    return {
      finalScriptSig: undefined,
      finalScriptWitness: witnessStackToScriptWitness([
        signedPset.inputs[0].partialSigs![0].signature,
        preimage,
        redeemScript,
      ]),
    };
  });
  return Extractor.extract(signedPset);
}

const blindPset = async (pset: Pset, ownedInput: OwnedInput): Promise<Pset> => {
  const zkpLib = await zkp();
  const { ecc } = zkpLib;
  const zkpValidator = new ZKPValidator(zkpLib);
  const zkpGenerator = new ZKPGenerator(zkpLib, ZKPGenerator.WithOwnedInputs([ownedInput]));
  const outputBlindingArgs = zkpGenerator.blindOutputs(pset, Pset.ECCKeysGenerator(ecc));
  const blinder = new Blinder(pset, [ownedInput], zkpValidator, zkpGenerator);
  blinder.blindLast({ outputBlindingArgs });
  return blinder.pset;
};

const signPset = async (
  pset: Pset,
  claimPublicKey: Buffer,
  claimKeyPair: ECPairInterface,
  preimage: Buffer
): Promise<Pset> => {
  const signer = new Signer(pset);
  const ecc = (await zkp()).ecc;
  const sig: BIP174SigningData = {
    partialSig: {
      pubkey: claimPublicKey,
      signature: bscript.signature.encode(claimKeyPair.sign(preimage), Transaction.SIGHASH_ALL),
    },
  };
  signer.addSignature(0, sig, Pset.ECDSASigValidator(ecc));
  return signer.pset;
};
