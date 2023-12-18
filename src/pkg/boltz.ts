// docs: https://docs.boltz.exchange/en/latest/api/

import { randomBytes } from 'crypto';
import type { OwnedInput } from 'liquidjs-lib';
import {
  address,
  AssetHash,
  Blinder,
  Creator,
  CreatorInput,
  crypto,
  Extractor,
  Finalizer,
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
import type { Unspent } from '../domain/chainsource';
import type { ECPairInterface } from 'ecpair';
import type { ZKP } from '@vulpemventures/secp256k1-zkp';
import { fromSatoshi } from '../extension/utility';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios, { AxiosError } from 'axios';
import { extractErrorMessage } from '../extension/utility/error';

export type NetworkString = 'liquid' | 'testnet' | 'regtest';

export interface BoltzInterface {
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
  makeClaimTransaction(p: MakeClaimTransactionParams): Transaction;
  getInvoiceExpireDate(invoice: string): number;
  getInvoiceValue(invoice: string): number;
}

interface CreateSwapCommonRequest {
  type: 'submarine' | 'reversesubmarine';
  pairId: 'L-BTC/BTC';
  orderSide: 'buy' | 'sell';
}

interface CreateSwapCommonResponse {
  id: string;
  timeoutBlockHeight: number;
}

interface SubmarineSwapRequest {
  invoice: string;
  refundPublicKey: string;
}

interface SubmarineSwapResponse {
  acceptZeroConf: boolean;
  address: string;
  bip21: string;
  blindingKey: string; // private
  expectedAmount: number;
  redeemScript: string;
}

interface ReverseSubmarineSwapRequest {
  preimageHash: string;
  invoiceAmount: number;
  claimPublicKey: string;
}

interface ReverseSubmarineSwapResponse {
  blindingKey: string; // private
  invoice: string;
  lockupAddress: string;
  onchainAmount: number;
  redeemScript: string;
}

export interface SubmarineSwap {
  address: string;
  expectedAmount: number;
  id: string;
  redeemScript: string;
}

export interface ReverseSwap {
  blindingPrivateKey: string;
  claimPublicKey: string;
  id: string;
  invoice: string;
  lockupAddress: string;
  preimage: Buffer;
  redeemScript: string;
  timeoutBlockHeight: number;
}

export interface MakeClaimTransactionParams {
  utxo: Unspent;
  claimKeyPair: ECPairInterface;
  preimage: Buffer;
  redeemScript: Buffer;
  destinationScript: Buffer;
  fee: number;
  blindingPublicKey: Buffer;
  timeoutBlockHeight: number;
}

const feeAmount = 500; // fee for regular liquid tx
const swapFeeAmount = 500; // fee for Boltz
// lightning swap invoice amount limit (in satoshis)
export const DEFAULT_LIGHTNING_LIMITS = { maximal: 4294967, minimal: 50000 };
export const DEPOSIT_LIGHTNING_LIMITS = {
  maximal: DEFAULT_LIGHTNING_LIMITS.maximal - feeAmount - swapFeeAmount,
  minimal: DEFAULT_LIGHTNING_LIMITS.minimal - feeAmount - swapFeeAmount,
};

export const boltzUrl: Record<NetworkString, string> = {
  regtest: 'http://localhost:9090',
  testnet: 'https://testnet.boltz.exchange/api',
  liquid: 'https://api.boltz.exchange',
};

export class Boltz implements BoltzInterface {
  private asset: string;
  private url: string;
  private zkp: ZKP;

  constructor(url: string, asset: string, zkp: ZKP) {
    this.asset = asset;
    this.url = url;
    this.zkp = zkp;
  }

  async getBoltzPair(pair: string): Promise<any> {
    const data = await this.getApi(`${this.url}/getpairs`);
    if (!data?.pairs?.[pair]) return;
    return data.pairs[pair];
  }

  // return invoice expire date
  getInvoiceExpireDate(invoice: string): number {
    const toMilliseconds = (num: number) => num * 1000;
    const { timeExpireDate, timestamp } = bolt11.decode(invoice);
    if (timeExpireDate) return toMilliseconds(timeExpireDate);
    const { expire_time } = bolt11.decode(invoice).tagsObject;
    const expireTime = toMilliseconds(expire_time ?? 3600);
    const from = timestamp ? toMilliseconds(timestamp) : Date.now();
    return from + expireTime;
  }

  // return value in given invoice
  getInvoiceValue(invoice: string): number {
    const { satoshis, millisatoshis } = bolt11.decode(invoice);
    if (satoshis) return fromSatoshi(satoshis, 8);
    if (millisatoshis) return fromSatoshi(Number(millisatoshis) / 1000, 8);
    return 0;
  }

  makeClaimTransaction({
    utxo,
    claimKeyPair,
    preimage,
    redeemScript,
    destinationScript,
    fee,
    blindingPublicKey,
    timeoutBlockHeight,
  }: MakeClaimTransactionParams): Transaction {
    if (!utxo.blindingData) throw new Error('utxo is not blinded');
    if (!utxo.witnessUtxo) throw new Error('utxo missing witnessUtxo');
    const pset = Creator.newPset();
    const updater = new Updater(pset);

    pset.addInput(
      new CreatorInput(utxo.txid, utxo.vout, 0xfffffffd, timeoutBlockHeight).toPartialInput()
    );
    updater.addInSighashType(0, Transaction.SIGHASH_ALL);
    updater.addInWitnessUtxo(0, utxo.witnessUtxo);
    updater.addInWitnessScript(0, utxo.witnessUtxo.script);

    updater.addOutputs([
      {
        script: destinationScript,
        blindingPublicKey,
        asset: this.asset,
        amount: (utxo.blindingData?.value ?? 0) - fee,
        blinderIndex: 0,
      },
      {
        amount: fee,
        asset: this.asset,
      },
    ]);

    console.log('pset', pset);

    const blindedPset = this.blindPset(pset, {
      index: 0,
      value: utxo.blindingData.value.toString(),
      valueBlindingFactor: Buffer.from(utxo.blindingData.valueBlindingFactor, 'hex'),
      asset: AssetHash.fromHex(utxo.blindingData.asset).bytesWithoutPrefix,
      assetBlindingFactor: Buffer.from(utxo.blindingData.assetBlindingFactor, 'hex'),
    });

    console.log('blindedPset', blindedPset);

    const signedPset = this.signPset(blindedPset, claimKeyPair);

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
    const base: CreateSwapCommonRequest = {
      type: 'submarine',
      pairId: 'L-BTC/BTC',
      orderSide: 'sell',
    };
    const req: SubmarineSwapRequest = {
      invoice,
      refundPublicKey,
    };
    const params: CreateSwapCommonRequest & SubmarineSwapRequest = { ...base, ...req };
    const {
      address,
      expectedAmount,
      id,
      redeemScript,
    }: CreateSwapCommonResponse & SubmarineSwapResponse = await this.callCreateSwap(params);

    const submarineSwap: SubmarineSwap = {
      address,
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
    const base: CreateSwapCommonRequest = {
      type: 'reversesubmarine',
      pairId: 'L-BTC/BTC',
      orderSide: 'buy',
    };
    const req: ReverseSubmarineSwapRequest = {
      claimPublicKey: claimPublicKey.toString('hex'),
      invoiceAmount,
      preimageHash,
    };
    const params: CreateSwapCommonRequest & ReverseSubmarineSwapRequest = { ...base, ...req };
    const {
      id,
      blindingKey,
      invoice,
      lockupAddress,
      redeemScript,
      timeoutBlockHeight,
    }: CreateSwapCommonResponse & ReverseSubmarineSwapResponse = await this.callCreateSwap(params);

    const reverseSwap: ReverseSwap = {
      blindingPrivateKey: blindingKey,
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

  private blindPset(pset: Pset, ownedInput: OwnedInput): Pset {
    const { ecc } = this.zkp;
    const zkpValidator = new ZKPValidator(this.zkp);
    const zkpGenerator = new ZKPGenerator(this.zkp, ZKPGenerator.WithOwnedInputs([ownedInput]));
    const outputBlindingArgs = zkpGenerator.blindOutputs(pset, Pset.ECCKeysGenerator(ecc));
    const blinder = new Blinder(pset, [ownedInput], zkpValidator, zkpGenerator);
    blinder.blindLast({ outputBlindingArgs });
    return blinder.pset;
  }

  private signPset(pset: Pset, claimKeyPair: ECPairInterface): Pset {
    const { ecc } = this.zkp;
    const signer = new Signer(pset);
    const toSign = signer.pset.getInputPreimage(0, Transaction.SIGHASH_ALL);
    signer.addSignature(
      0,
      {
        partialSig: {
          pubkey: claimKeyPair.publicKey,
          signature: bscript.signature.encode(claimKeyPair.sign(toSign), Transaction.SIGHASH_ALL),
        },
      },
      Pset.ECDSASigValidator(ecc)
    );
    return signer.pset;
  }

  private callCreateSwap = async (
    params: CreateSwapCommonRequest
  ): Promise<CreateSwapCommonResponse & any> => {
    return this.postApi(`${this.url}/createswap`, params);
  };

  private getApi = async (url: string): Promise<any> => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { status, data } = await axios.get(url, config);
      if (status !== 200) throw new Error(data);
      return data;
    } catch (error: unknown | AxiosError) {
      const errorExtracted = extractErrorMessage(error);
      throw new Error(errorExtracted);
    }
  };

  private postApi = async (url: string, params: any = {}): Promise<any> => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { status, data } = await axios.post(url, params, config);
      if (status !== 201) throw new Error(data);
      return data;
    } catch (error: unknown | AxiosError) {
      const errorExtracted = extractErrorMessage(error);
      throw new Error(errorExtracted);
    }
  };
}
