import {
  Creator,
  Updater,
  Extractor,
  Finalizer,
  CreatorInput,
  Transaction,
  witnessStackToScriptWitness,
} from 'liquidjs-lib';
import type { UnblindedOutput } from 'marina-provider';
import type { Output } from 'liquidjs-lib/src/transaction';
import { BlinderService } from '../blinder';
import ZKPLib from '@vulpemventures/secp256k1-zkp';
import { SignerService } from '../signer';
import type { AppRepository, WalletRepository } from '../../domain/repository';

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
export const constructClaimTransaction = async (
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
): Promise<Transaction> => {
  const pset = Creator.newPset();
  const updater = new Updater(pset);

  let utxoValueSum = BigInt(0);

  for (const [i, utxo] of utxos.entries()) {
    utxoValueSum += BigInt(utxo.blindingData?.value ?? 0);
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

  updater.addOutputs([
    {
      script: destinationScript,
      blindingPublicKey: blindingKey,
      asset: assetHash,
      amount: Number(utxoValueSum - BigInt(fee)),
      blinderIndex: blindingKey !== undefined ? 0 : undefined,
    },
    {
      amount: fee,
      asset: assetHash,
    },
  ]);

  const blinder = new BlinderService(walletRepository, await ZKPLib());
  const blindedPset = await blinder.blindPset(pset);

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
};
