import bolt11, { TagData } from 'bolt11';
import { constructClaimTransaction, OutputType } from 'boltz-core-liquid';
import { fetchTxHex, Outpoint, AddressInterface, NetworkString } from 'ldk';
import { MnemonicAccount } from '../../domain/account';
import { address, crypto, script, Transaction } from 'liquidjs-lib';
import { lbtcAssetByNetwork } from '../../application/utils/network';
import { fromSatoshi } from './format';

export const DEFAULT_LIGHTNING_LIMITS = { maximal: 0.04294967, minimal: 0.0005 };

// Submarine swaps

// validates if invoice has correct payment hash tag
const correctPaymentHashInInvoice = (invoice: string, preimage: Buffer) => {
  const paymentHash = getInvoiceTag(invoice, 'payment_hash');
  const preimageHash = crypto.sha256(preimage).toString('hex');
  return paymentHash === preimageHash;
};

const validSwapReedemScript = (redeemScript: string, refundPublicKey: string) => {
  const scriptAssembly = script
    .toASM(script.decompile(Buffer.from(redeemScript, 'hex')) || [])
    .split(' ');
  const xxx = scriptAssembly[4];
  const cltv = scriptAssembly[6];
  const preimageHash = scriptAssembly[1];
  const expectedScript = [
    'OP_HASH160',
    preimageHash,
    'OP_EQUAL',
    'OP_IF',
    xxx,
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

export const isValidSubmarineSwap = (
  redeemScript: string,
  refundPublicKey: string
): boolean => validSwapReedemScript(redeemScript, refundPublicKey);

// Reverse submarine swaps

// validates if reverse swap address derives from redeem script
const reverseSwapAddressDerivesFromScript = (lockupAddress: string, redeemScript: string) => {
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
  const transaction = Transaction.fromHex(hex);
  const { script, value, asset, nonce } = transaction.outs[utxo.vout];

  // very unsafe, migrate to Psbt approach to claim the funds soon
  const keyPairUnsafe = account.getSigningKeyUnsafe(password, addr.derivationPath!, network);
  return constructClaimTransaction(
    [
      {
        keys: keyPairUnsafe,
        redeemScript: Buffer.from(redeemScript, 'hex'),
        preimage,
        type: OutputType.Bech32,
        txHash: transaction.getHash(),
        vout: utxo.vout,
        script,
        value,
        asset,
        nonce,
      },
    ],
    address.toOutputScript(addr.confidentialAddress),
    1,
    true,
    lbtcAssetByNetwork(network)
  );
};
