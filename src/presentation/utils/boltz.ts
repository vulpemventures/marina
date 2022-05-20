import type { TagData } from 'bolt11';
import bolt11 from 'bolt11';
import type { Outpoint, AddressInterface, NetworkString} from 'ldk';
import { fetchTxHex, getNetwork } from 'ldk';
import type { MnemonicAccount } from '../../domain/account';
import {
  address,
  AssetHash,
  confidential,
  crypto,
  script,
  Transaction,
  Psbt,
  witnessStackToScriptWitness,
} from 'liquidjs-lib';
import { lbtcAssetByNetwork } from '../../application/utils/network';
import { fromSatoshi } from './format';

export const DEFAULT_LIGHTNING_LIMITS = { maximal: 0.04294967, minimal: 0.0005 };

// Submarine swaps

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

export const isValidSubmarineSwap = (redeemScript: string, refundPublicKey: string): boolean =>
  validSwapReedemScript(redeemScript, refundPublicKey);

// Reverse submarine swaps

// validates if invoice has correct payment hash tag
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

export const isValidReverseSubmarineSwap = (
  invoice: string,
  lockupAddress: string,
  preimage: Buffer,
  pubKey: string,
  redeemScript: string
): boolean => {
  return (
    correctPaymentHashInInvoice(invoice, preimage) &&
    reverseSwapAddressDerivesFromScript(lockupAddress, redeemScript) &&
    validReverseSwapReedemScript(preimage, pubKey, redeemScript)
  );
};

export const getInvoiceTag = (invoice: string, tag: string): TagData => {
  const decodedInvoice = bolt11.decode(invoice);
  for (const { tagName, data } of decodedInvoice.tags) {
    if (tagName === tag) return data;
  }
  return '';
};

export const getInvoiceValue = (invoice: string): number => {
  const { satoshis, millisatoshis } = bolt11.decode(invoice);
  if (satoshis) return fromSatoshi(satoshis);
  if (millisatoshis) return fromSatoshi(Number(millisatoshis) / 1000);
  return 0;
};

export const getInvoiceExpireDate = (invoice: string): number => {
  const { timeExpireDate } = bolt11.decode(invoice);
  return timeExpireDate ? timeExpireDate * 1000 : 0; // milliseconds
}

// validates if address derives from a given redeem script
const addressDerivesFromScript = (lockupAddress: string, redeemScript: string) => {
  const addressScript = address.toOutputScript(lockupAddress);
  const addressScriptASM = script.toASM(script.decompile(addressScript) || []);
  const sha256 = crypto.hash160(Buffer.from(redeemScript, 'hex')).toString('hex');
  const expectedAddressScriptASM = `OP_0 ${sha256}`; // P2SH
  return addressScriptASM === expectedAddressScriptASM;
};

// validates if we can redeem with this redeem script
const validReverseSwapReedemScript = (
  preimage: Buffer,
  pubKey: string,
  redeemScript: string
) => {
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

export const isValidInvoice = (
  invoice: string,
  lockupAddress: string,
  preimage: Buffer,
  pubKey: string,
  redeemScript: string
): boolean => {
  return (
    correctPaymentHashInInvoice(invoice, preimage) &&
    reverseSwapAddressDerivesFromScript(lockupAddress, redeemScript) &&
    validReverseSwapReedemScript(preimage, pubKey, redeemScript)
  );
};

export const getClaimTransaction = async (
  account: MnemonicAccount,
  addr: AddressInterface,
  explorerURL: string,
  network: NetworkString,
  password: string,
  preimage: Buffer,
  redeemScript: string,
  utxos: Outpoint[]
): Promise<Transaction> => {
  // utxo has arrived, prepare claim transaction
  const [utxo] = utxos;
  const hex = await fetchTxHex(utxo.txid, explorerURL);
  const prevout = Transaction.fromHex(hex).outs[utxo.vout];

  const tx = new Psbt({ network: getNetwork(network) });

  // add the lockup utxo of Boltz
  tx.addInput({
    hash: utxo.txid,
    index: utxo.vout,
    witnessUtxo: prevout,
    witnessScript: Buffer.from(redeemScript, 'hex'),
  });

  const LBTC = AssetHash.fromHex(lbtcAssetByNetwork(network), false).bytes;
  const EMPTY_BUFFER = Buffer.alloc(0);

  const feeAmount = 300;
  const claimValue = confidential.confidentialValueToSatoshi(prevout.value) - feeAmount;

  // add our destination script
  tx.addOutput({
    script: address.toOutputScript(addr.confidentialAddress),
    value: confidential.satoshiToConfidentialValue(claimValue),
    asset: LBTC,
    nonce: EMPTY_BUFFER,
  });
  tx.addOutput({
    script: EMPTY_BUFFER,
    value: confidential.satoshiToConfidentialValue(feeAmount),
    asset: LBTC,
    nonce: EMPTY_BUFFER,
  });

  const keyPairUnsafe = account.getSigningKeyUnsafe(password, addr.derivationPath!, network);
  const stx = tx.signInput(0, keyPairUnsafe);

  // TODO don't use account.getSigningKeyUnsafe
  // const identity = await account.getSigningIdentity(password, network);
  // const signedTxBase64 = await identity.signPset(tx.toBase64());
  // const stx = Psbt.fromBase64(signedTxBase64);

  //stx.validateSignaturesOfAllInputs(Psbt.ECDSASigValidator(ecc));
  stx.finalizeInput(0, (_, input) => {
    return {
      finalScriptSig: undefined,
      finalScriptWitness: witnessStackToScriptWitness([
        input.partialSig![0].signature,
        preimage,
        Buffer.from(redeemScript, 'hex'),
      ]),
    };
  });

  const txHex = stx.extractTransaction().toHex();
  return Transaction.fromHex(txHex);
};
