import type { TagData } from 'bolt11';
import bolt11 from 'bolt11';
import { address, crypto, script, payments } from 'liquidjs-lib';
import { randomBytes } from 'crypto';
import Decimal from 'decimal.js';
import type { NetworkString } from 'marina-provider';
import { bech32 } from 'bech32';
import { fromSatoshi } from '../../extension/utility';
import Boltz from './index';
import type { SubmarineSwapResponse, CreateSwapCommonResponse } from './index';

export const feeAmount = 500; // fee for regular liquid tx
export const swapFeeAmount = 500; // fee for Boltz

// lightning swap invoice amount limit (in satoshis)
export const DEFAULT_LIGHTNING_LIMITS = { maximal: 4294967, minimal: 50000 };
export const DEPOSIT_LIGHTNING_LIMITS = {
  maximal: DEFAULT_LIGHTNING_LIMITS.maximal - feeAmount - swapFeeAmount,
  minimal: DEFAULT_LIGHTNING_LIMITS.minimal - feeAmount - swapFeeAmount,
};

/////////////////////////////////////////////////////////////
// UTILS

// check if amount is out of bounds for lightning swap
export const swapDepositAmountOutOfBounds = (amount = 0): boolean =>
  amount > DEPOSIT_LIGHTNING_LIMITS.maximal || amount < DEPOSIT_LIGHTNING_LIMITS.minimal;

// calculate boltz fees for a given amount
export const submarineSwapBoltzFees = (amount = 0): number => {
  const minersFee = 340;
  const percentage = 1.005;
  const invoiceAmount = new Decimal(amount).minus(minersFee).div(percentage).toNumber();
  return Decimal.ceil(amount - invoiceAmount).toNumber();
};

// return data for given tag in given invoice
export const getInvoiceTag = (invoice: string, tag: string): TagData => {
  const decodedInvoice = bolt11.decode(invoice);
  for (const { tagName, data } of decodedInvoice.tags) {
    if (tagName === tag) return data;
  }
  return '';
};

// return value in given invoice
export const getInvoiceValue = (invoice: string): number => {
  const { satoshis, millisatoshis } = bolt11.decode(invoice);
  if (satoshis) return fromSatoshi(satoshis, 8);
  if (millisatoshis) return fromSatoshi(Number(millisatoshis) / 1000, 8);
  return 0;
};

// return invoice expire date
export const getInvoiceExpireDate = (invoice: string): number => {
  const { timeExpireDate } = bolt11.decode(invoice);
  return timeExpireDate ? timeExpireDate * 1000 : 0; // milliseconds
};

/////////////////////////////////////////////////////////////
// SUBMARINE SWAPS (LBTC => Lightning)

export interface SubmarineSwap {
  address: string;
  // blindingKey: string;
  expectedAmount: number;
  id: string;
  redeemScript: string;
}

// validates redeem script is in expected template
const validSwapReedemScript = (redeemScript: string, refundPublicKey: string) => {
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
};

// check if everything is correct with data received from Boltz:
// - redeem script
const isValidSubmarineSwap = (redeemScript: string, refundPublicKey: string): boolean =>
  validSwapReedemScript(redeemScript, refundPublicKey);

// create submarine swap
export const createSubmarineSwap = async (
  invoice: string,
  network: NetworkString,
  refundPublicKey: string
): Promise<SubmarineSwap> => {
  // boltz object
  const boltz = new Boltz(network);

  // create submarine swap
  const {
    address,
    expectedAmount,
    id,
    redeemScript,
  }: CreateSwapCommonResponse & SubmarineSwapResponse = await boltz.createSubmarineSwap({
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
  if (!isValidSubmarineSwap(redeemScript, refundPublicKey))
    throw new Error('Invalid submarine swap');
  return submarineSwap;
};

/////////////////////////////////////////////////////////////
// REVERSE SUBMARINE SWAPS (Lightning => LBTC)

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

// validates if invoice has correct payment hashtag
const correctPaymentHashInInvoice = (invoice: string, preimage: Buffer) => {
  const paymentHash = getInvoiceTag(invoice, 'payment_hash');
  const preimageHash = crypto.sha256(preimage).toString('hex');
  return paymentHash === preimageHash;
};

// validates if reverse swap address derives from redeem script
const reverseSwapAddressDerivesFromScript = (lockupAddress: string, redeemScript: string) => {
  const addressScript = address.toOutputScript(lockupAddress);
  const addressScriptASM = script.toASM(script.decompile(addressScript) || []);
  const sha256 = crypto.sha256(Buffer.from(redeemScript, 'hex')).toString('hex');
  const expectedAddressScriptASM = `OP_0 ${sha256}`; // P2SH
  return addressScriptASM === expectedAddressScriptASM;
};

// check if everything is correct with data received from Boltz:
// - invoice
// - lockup address
// - redeem script
const isValidReverseSubmarineSwap = ({
  invoice,
  lockupAddress,
  preimage,
  claimPublicKey,
  redeemScript,
}: ReverseSwap): boolean => {
  return (
    correctPaymentHashInInvoice(invoice, preimage) &&
    reverseSwapAddressDerivesFromScript(lockupAddress, redeemScript) &&
    validReverseSwapReedemScript(preimage, claimPublicKey, redeemScript)
  );
};

// validates if we can redeem with this redeem script
const validReverseSwapReedemScript = (preimage: Buffer, pubKey: string, redeemScript: string) => {
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
};

// create reverse submarine swap
export const createReverseSubmarineSwap = async (
  publicKey: Buffer,
  network: NetworkString,
  invoiceAmount: number
): Promise<ReverseSwap> => {
  const boltz = new Boltz(network);

  // preimage
  const preimage = randomBytes(32);
  const preimageHash = crypto.sha256(preimage).toString('hex');

  // claim public key
  const p = payments.p2pkh({ pubkey: publicKey });
  const claimPublicKey = p.pubkey!.toString('hex');

  // create reverse submarine swap
  const { id, blindingKey, invoice, lockupAddress, redeemScript, timeoutBlockHeight } =
    await boltz.createReverseSubmarineSwap({
      claimPublicKey,
      invoiceAmount,
      preimageHash,
    });

  const reverseSwap: ReverseSwap = {
    blindingKey,
    claimPublicKey,
    id,
    invoice,
    lockupAddress,
    preimage,
    redeemScript,
    timeoutBlockHeight,
  };
  if (!isValidReverseSubmarineSwap(reverseSwap))
    throw new Error('Invalid invoice received, please try again');
  return reverseSwap;
};

export function parseLNURL(lnurl: string) {
  if (lnurl.includes('@')) {
    // Lightning address
    const urlsplit = lnurl.split('@');
    return `https://${urlsplit[1]}/.well-known/lnurlp/${urlsplit[0]}`;
  }
  // LNURL
  const { words } = bech32.decode(lnurl, 2000);
  const requestByteArray = bech32.fromWords(words);
  return Buffer.from(requestByteArray).toString();
}

export async function fetchInvoiceFromLNURL(lnurl: string, amount_sat: number): Promise<string> {
  const url = parseLNURL(lnurl);
  const amount = Math.round(amount_sat * 1000);

  const checkResponse = (resp: Response) => resp.json();

  return new Promise((resolve, reject) => {
    fetch(url)
      .then(checkResponse)
      .then((data) => {
        if (amount < data.minSendable || amount > data.maxSendable) {
          return reject('Amount not in LNURL range.');
        }
        fetch(`${data.callback}?amount=${amount}`)
          .then(checkResponse)
          .then((data) => resolve(data.pr))
          .catch(reject);
      })
      .catch(reject);
  });
}
