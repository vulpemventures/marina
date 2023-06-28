import type { OwnedInput } from 'liquidjs-lib';
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
} from 'liquidjs-lib';
import type { UnblindedOutput } from 'marina-provider';
import type { Output } from 'liquidjs-lib/src/transaction';
import { SignerService } from '../signer';
import type { AppRepository, WalletRepository } from '../../domain/repository';
import zkp from '@vulpemventures/secp256k1-zkp';

/**
 * Claim swaps
 *
 * @param utxos UTXOs that should be claimed or refunded
 * @param witnessUtxo
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
  utxos: UnblindedOutput[],
  witnessUtxo: Output,
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

  let utxoValueSum = 0;

  for (const [i, utxo] of utxos.entries()) {
    utxoValueSum += utxo.blindingData?.value ?? 0;
    pset.addInput(
      new CreatorInput(
        utxo.txid,
        utxo.vout,
        isRbf ? 0xfffffffd : 0xffffffff,
        i === 0 ? timeoutBlockHeight : undefined
      ).toPartialInput()
    );
    updater.addInSighashType(i, Transaction.SIGHASH_ALL);
    updater.addInWitnessUtxo(i, witnessUtxo);
    updater.addInWitnessScript(i, witnessUtxo.script);
  }

  /*
  // Convert private blinding key to public blinding key
  const masterBlindingKey = await walletRepository.getMasterBlindingKey();
  if (!masterBlindingKey) throw new Error('Master blinding key not found');
  const slip77 = SLIP77Factory(ecc);
  const blindingKeyNode = slip77.fromMasterBlindingKey(blindingKey!);
  const blindingPublicKey = blindingKeyNode.publicKey;
  */

  updater.addOutputs([
    {
      script: destinationScript,
      blindingPublicKey: blindingKey,
      // blindingPublicKey: blindingPublicKey,
      asset: assetHash,
      amount: utxoValueSum - fee,
      blinderIndex: blindingKey !== undefined ? 0 : undefined,
    },
    {
      amount: fee,
      asset: assetHash,
    },
  ]);

  const blindedPset = await blindPset(pset, {
    index: 0,
    value: utxos[0].blindingData!.value.toString(),
    valueBlindingFactor: Buffer.from(utxos[0].blindingData!.valueBlindingFactor, 'hex'),
    asset: AssetHash.fromHex(utxos[0].blindingData!.asset).bytesWithoutPrefix,
    assetBlindingFactor: Buffer.from(utxos[0].blindingData!.assetBlindingFactor, 'hex'),
  });

  const signer = await SignerService.fromPassword(walletRepository, appRepository, password);
  const signedPset = await signer.signPset(blindedPset);

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

/*
const blindPset = async (pset: Pset): Promise<Pset> => {
  const zkpLib = await zkp();
  const { ecc } = zkpLib;
  const zkpValidator = new ZKPValidator(zkpLib);
  const blindingKeys = psetToBlindingPrivateKeys(pset);
  const zkpGenerator = new ZKPGenerator(
    zkpLib,
    ZKPGenerator.WithBlindingKeysOfInputs(blindingKeys)
  );
  const ownedInputs = zkpGenerator.unblindInputs(pset);
  const keysGenerator = Pset.ECCKeysGenerator(ecc);
  const outputBlindingArgs = zkpGenerator.blindOutputs(pset, keysGenerator);
  const blinder = new Blinder(pset, ownedInputs, zkpValidator, zkpGenerator);
  blinder.blindLast({ outputBlindingArgs });
  return blinder.pset;
};
*/
