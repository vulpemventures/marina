import type { Transaction } from 'liquidjs-lib';
import { address, networks, payments } from 'liquidjs-lib';
import type { NetworkString, SignedMessage } from 'marina-provider';
import { mnemonicToSeed } from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { signAsync } from 'bitcoinjs-message';
import type { UnblindedOutput } from './domain/transaction';
import { appRepository, walletRepository } from './infrastructure/storage/common';

const bip32 = BIP32Factory(ecc);

export const isConfidentialAddress = (addr: string): boolean => {
  try {
    address.fromConfidential(addr);
    return true;
  } catch (ignore) {
    return false;
  }
};

export const isValidAddressForNetwork = (addr: string, net: NetworkString): boolean => {
  try {
    const network = networks[net];
    if (!network) {
      throw new Error('network not found');
    }
    address.toOutputScript(addr, network);
    return true;
  } catch (ignore) {
    return false;
  }
};

export async function signMessageWithMnemonic(
  message: string,
  mnemonic: string,
  network: networks.Network
): Promise<SignedMessage> {
  const seed = await mnemonicToSeed(mnemonic);
  const node = bip32.fromSeed(seed, network);
  const child = node.derivePath("m/84'/0'/0'/0/0");
  const signature = await signAsync(message, child.privateKey!, true, {
    segwitType: 'p2wpkh',
  });

  const pay = payments.p2wpkh({ pubkey: child.publicKey, network });
  return {
    signature: signature.toString('base64'),
    address: pay.address!,
    publicKey: child.publicKey.toString('hex'),
  };
}

export function computeBalances(utxos: UnblindedOutput[]): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const utxo of utxos) {
    if (!utxo.blindingData) continue;
    const { asset, value } = utxo.blindingData;
    balances[asset] = (balances[asset] || 0) + value;
  }
  return balances;
}

export function getNetwork(network: NetworkString): networks.Network {
  const net = networks[network];
  if (!net) {
    throw new Error('network not found');
  }
  return net;
}

const reverseHex = (hex: string) => Buffer.from(hex, 'hex').reverse().toString('hex');

export async function makeURLwithBlinders(transaction: Transaction) {
  const webExplorerURL = await appRepository.getWebExplorerURL();
  if (!webExplorerURL) {
    throw new Error('web explorer url not found');
  }
  const txID = transaction.getId();

  const blinders: string[] = [];
  for (let i = 0; i < transaction.outs.length; i++) {
    const output = transaction.outs[i];
    if (output.script.length === 0) continue;
    const data = await walletRepository.getOutputBlindingData(txID, i);
    if (!data || !data.blindingData) continue;

    blinders.push(
      `${data.blindingData.value},${data.blindingData.asset},${reverseHex(
        data.blindingData.valueBlindingFactor
      )},${reverseHex(data.blindingData.assetBlindingFactor)}`
    );
  }

  const url = `${webExplorerURL}/tx/${txID}#blinded=${blinders.join(',')}`;
  return url;
}
