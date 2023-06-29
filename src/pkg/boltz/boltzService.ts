import type { CreateSwapCommonResponse, NetworkString, SubmarineSwapResponse } from './boltz';
import { Boltz } from './boltz';
import { randomBytes } from 'crypto';
import type { BIP174SigningData, OwnedInput } from 'liquidjs-lib';
import {
  address,
  AssetHash,
  Blinder,
  Creator,
  CreatorInput,
  crypto,
  Extractor,
  Finalizer,
  networks,
  Pset,
  script as bscript,
  script,
  Signer,
  Transaction,
  Updater,
  witnessStackToScriptWitness,
  ZKPGenerator,
  ZKPValidator,
} from 'liquidjs-lib';
import type { TagData } from 'bolt11';
import bolt11 from 'bolt11';
import type { Unspent } from '../../domain/chainsource';
import type { ECPairInterface } from 'ecpair';
import zkp from '@vulpemventures/secp256k1-zkp';
import { fromSatoshi } from '../../extension/utility';

export interface BoltzServiceInterface {
  getBoltzPair(pair: string): Promise<any>;
  createSubmarineSwap(
    invoice: string,
    network: NetworkString,
    refundPublicKey: string
  ): Promise<SubmarineSwap>;
  createReverseSubmarineSwap(
    claimPublicKey: Buffer,
    network: NetworkString,
    invoiceAmount: number
  ): Promise<ReverseSwap>;
  makeClaimTransaction(p: MakeClaimTransactionParams): Promise<Transaction>;
  getInvoiceExpireDate(invoice: string): number;
  getInvoiceValue(invoice: string): number;
}

export interface SubmarineSwap {
  address: string;
  expectedAmount: number;
  id: string;
  redeemScript: string;
}

export interface ReverseSwap {
  blindingKey: string;
  claimPublicKey: string;
  id: string;
  invoice: string;
  lockupAddress: string;
  preimage: Buffer;
  redeemScript: string;
  timeoutBlockHeight: number;
}

interface MakeClaimTransactionParams {
  utxo: Unspent;
  claimPublicKey: Buffer;
  claimKeyPair: ECPairInterface;
  preimage: Buffer;
  redeemScript: Buffer;
  destinationScript: Buffer;
  fee: number;
  password: string;
  blindingKey?: Buffer;
  timeoutBlockHeight?: number;
}

const feeAmount = 500; // fee for regular liquid tx
const swapFeeAmount = 500; // fee for Boltz
// lightning swap invoice amount limit (in satoshis)
export const DEFAULT_LIGHTNING_LIMITS = { maximal: 4294967, minimal: 50000 };
export const DEPOSIT_LIGHTNING_LIMITS = {
  maximal: DEFAULT_LIGHTNING_LIMITS.maximal - feeAmount - swapFeeAmount,
  minimal: DEFAULT_LIGHTNING_LIMITS.minimal - feeAmount - swapFeeAmount,
};

export class BoltzService implements BoltzServiceInterface {
  private boltz: Boltz;
  private network: NetworkString;

  constructor(network: NetworkString) {
    this.network = network;
    this.boltz = new Boltz(network);
  }

  async getBoltzPair(pair: string): Promise<any> {
    return this.boltz.getPair(pair);
  }

  // return invoice expire date
  getInvoiceExpireDate(invoice: string): number {
    const { timeExpireDate } = bolt11.decode(invoice);
    return timeExpireDate ? timeExpireDate * 1000 : 0; // milliseconds
  }

  // return value in given invoice
  getInvoiceValue(invoice: string): number {
    const { satoshis, millisatoshis } = bolt11.decode(invoice);
    if (satoshis) return fromSatoshi(satoshis, 8);
    if (millisatoshis) return fromSatoshi(Number(millisatoshis) / 1000, 8);
    return 0;
  }

  async makeClaimTransaction({
    utxo,
    claimPublicKey,
    claimKeyPair,
    preimage,
    redeemScript,
    destinationScript,
    fee,
    password,
    blindingKey,
    timeoutBlockHeight,
  }: MakeClaimTransactionParams): Promise<Transaction> {
    const pset = Creator.newPset();
    const updater = new Updater(pset);

    pset.addInput(
      new CreatorInput(utxo.txid, utxo.vout, 0xfffffffd, timeoutBlockHeight).toPartialInput()
    );
    updater.addInSighashType(0, Transaction.SIGHASH_ALL);
    updater.addInWitnessUtxo(0, utxo.witnessUtxo!);
    updater.addInWitnessScript(0, utxo.witnessUtxo!.script);

    updater.addOutputs([
      {
        script: destinationScript,
        blindingPublicKey: blindingKey,
        asset: networks[this.network].assetHash,
        amount: (utxo.blindingData?.value ?? 0) - fee,
        blinderIndex: blindingKey !== undefined ? 0 : undefined,
      },
      {
        amount: fee,
        asset: networks[this.network].assetHash,
      },
    ]);

    console.log('pset', pset);

    const blindedPset = await this.blindPset(pset, {
      index: 0,
      value: utxo.blindingData!.value.toString(),
      valueBlindingFactor: Buffer.from(utxo.blindingData!.valueBlindingFactor, 'hex'),
      asset: AssetHash.fromHex(utxo.blindingData!.asset).bytesWithoutPrefix,
      assetBlindingFactor: Buffer.from(utxo.blindingData!.assetBlindingFactor, 'hex'),
    });

    console.log('blindedPset', blindedPset);

    const signedPset = await this.signPset(blindedPset, claimPublicKey, claimKeyPair, preimage);

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

  async createSubmarineSwap(
    invoice: string,
    network: NetworkString,
    refundPublicKey: string
  ): Promise<SubmarineSwap> {
    // create submarine swap
    const {
      address,
      expectedAmount,
      id,
      redeemScript,
    }: CreateSwapCommonResponse & SubmarineSwapResponse = await this.boltz.createSubmarineSwap({
      invoice,
      refundPublicKey,
    });

    const submarineSwap: SubmarineSwap = {
      address,
      // blindingKey,
      expectedAmount,
      id,
      redeemScript,
    };
    if (!this.validateSwapReedemScript(redeemScript, refundPublicKey))
      throw new Error('Invalid submarine swap');
    return submarineSwap;
  }

  async createReverseSubmarineSwap(
    claimPublicKey: Buffer,
    network: NetworkString,
    invoiceAmount: number
  ): Promise<ReverseSwap> {
    // preimage
    const preimage = randomBytes(32);
    const preimageHash = crypto.sha256(preimage).toString('hex');

    // create reverse submarine swap
    const { id, blindingKey, invoice, lockupAddress, redeemScript, timeoutBlockHeight } =
      await this.boltz.createReverseSubmarineSwap({
        claimPublicKey: claimPublicKey.toString('hex'),
        invoiceAmount,
        preimageHash,
      });

    const reverseSwap: ReverseSwap = {
      blindingKey,
      claimPublicKey: claimPublicKey.toString('hex'),
      id,
      invoice,
      lockupAddress,
      preimage,
      redeemScript,
      timeoutBlockHeight,
    };
    if (!this.isValidReverseSubmarineSwap(reverseSwap))
      throw new Error('Invalid invoice received, please try again');
    return reverseSwap;
  }

  // check that everything is correct with data received from Boltz:
  // - invoice
  // - lockup address
  // - redeem script
  private isValidReverseSubmarineSwap({
    invoice,
    lockupAddress,
    preimage,
    claimPublicKey,
    redeemScript,
  }: ReverseSwap): boolean {
    return (
      this.correctPaymentHashInInvoice(invoice, preimage) &&
      this.reverseSwapAddressDerivesFromScript(lockupAddress, redeemScript) &&
      this.validateReverseSwapReedemScript(preimage, claimPublicKey, redeemScript)
    );
  }

  // validates if invoice has correct payment hashtag
  private correctPaymentHashInInvoice(invoice: string, preimage: Buffer): boolean {
    const paymentHash = this.getInvoiceTag(invoice, 'payment_hash');
    const preimageHash = crypto.sha256(preimage).toString('hex');
    return paymentHash === preimageHash;
  }

  // return data for given tag in given invoice
  private getInvoiceTag(invoice: string, tag: string): TagData {
    const decodedInvoice = bolt11.decode(invoice);
    for (const { tagName, data } of decodedInvoice.tags) {
      if (tagName === tag) return data;
    }
    return '';
  }

  // validates if reverse swap address derives from redeem script
  private reverseSwapAddressDerivesFromScript(
    lockupAddress: string,
    redeemScript: string
  ): boolean {
    const addressScript = address.toOutputScript(lockupAddress);
    const addressScriptASM = script.toASM(script.decompile(addressScript) || []);
    const sha256 = crypto.sha256(Buffer.from(redeemScript, 'hex')).toString('hex');
    const expectedAddressScriptASM = `OP_0 ${sha256}`; // P2SH
    return addressScriptASM === expectedAddressScriptASM;
  }

  // validates if we can redeem with this redeem script
  private validateReverseSwapReedemScript(
    preimage: Buffer,
    pubKey: string,
    redeemScript: string
  ): boolean {
    const scriptAssembly = script
      .toASM(script.decompile(Buffer.from(redeemScript, 'hex')) || [])
      .split(' ');
    const cltv = scriptAssembly[10];
    const refundPubKey = scriptAssembly[13];
    const expectedScript = [
      'OP_SIZE',
      '20',
      'OP_EQUAL',
      'OP_IF',
      'OP_HASH160',
      crypto.hash160(preimage).toString('hex'),
      'OP_EQUALVERIFY',
      pubKey,
      'OP_ELSE',
      'OP_DROP',
      cltv,
      'OP_NOP2',
      'OP_DROP',
      refundPubKey,
      'OP_ENDIF',
      'OP_CHECKSIG',
    ];
    return scriptAssembly.join() === expectedScript.join();
  }

  // validates redeem script is in expected template
  private validateSwapReedemScript(redeemScript: string, refundPublicKey: string) {
    const scriptAssembly = script
      .toASM(script.decompile(Buffer.from(redeemScript, 'hex')) || [])
      .split(' ');
    const boltzHash = scriptAssembly[4];
    const cltv = scriptAssembly[6];
    const preimageHash = scriptAssembly[1];
    const expectedScript = [
      'OP_HASH160',
      preimageHash,
      'OP_EQUAL',
      'OP_IF',
      boltzHash,
      'OP_ELSE',
      cltv,
      'OP_NOP2',
      'OP_DROP',
      refundPublicKey,
      'OP_ENDIF',
      'OP_CHECKSIG',
    ];
    return scriptAssembly.join() === expectedScript.join();
  }

  private async blindPset(pset: Pset, ownedInput: OwnedInput): Promise<Pset> {
    const zkpLib = await zkp();
    const { ecc } = zkpLib;
    const zkpValidator = new ZKPValidator(zkpLib);
    const zkpGenerator = new ZKPGenerator(zkpLib, ZKPGenerator.WithOwnedInputs([ownedInput]));
    const outputBlindingArgs = zkpGenerator.blindOutputs(pset, Pset.ECCKeysGenerator(ecc));
    const blinder = new Blinder(pset, [ownedInput], zkpValidator, zkpGenerator);
    blinder.blindLast({ outputBlindingArgs });
    return blinder.pset;
  }

  private async signPset(
    pset: Pset,
    claimPublicKey: Buffer,
    claimKeyPair: ECPairInterface,
    preimage: Buffer
  ): Promise<Pset> {
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
  }
}
