import * as ecc from "tiny-secp256k1";
import { mnemonicToSeed } from "bip39";
import { AccountType, NetworkString } from "marina-provider";
import { Account, MainAccount, MainAccountTest, MainAccountLegacy } from "../domain/account";
import { encrypt } from "../encryption";
import { WalletRepository } from "./repository";
import { SLIP77Factory } from "slip77";
import { BIP32Factory } from "bip32";

const slip77 = SLIP77Factory(ecc);
const bip32 = BIP32Factory(ecc);

const initialNextKeyIndexes: Record<NetworkString, { external: number; internal: number }> = {
  liquid: { external: 0, internal: 0 },
  regtest: { external: 0, internal: 0 },
  testnet: { external: 0, internal: 0 },
};

export function makeAccountXPub(seed: Buffer, basePath: string) {
  return bip32
    .fromSeed(seed)
    .derivePath(basePath)
    .neutered()
    .toBase58();
}

export async function initWalletRepository(walletRepository: WalletRepository, onboardingMnemonic: string, onboardingPassword: string) {
  const encryptedData = await encrypt(onboardingMnemonic, onboardingPassword);
  const seed = await mnemonicToSeed(onboardingMnemonic);
  const masterBlindingKey = slip77.fromSeed(seed).masterKey.toString('hex');

  // set the global seed data
  await walletRepository.setSeedData(encryptedData, masterBlindingKey);

  // set the default accounts data (MainAccount, MainAccountTest, MainAccountLegacy)
  // cointype account (mainnet)
  const defaultMainAccountXPub = makeAccountXPub(seed, Account.BASE_DERIVATION_PATH);
  await walletRepository.updateAccountDetails(MainAccount, {
    accountID: MainAccount,
    type: AccountType.P2WPKH,
    masterXPub: defaultMainAccountXPub,
    baseDerivationPath: Account.BASE_DERIVATION_PATH,
    accountNetworks: ['liquid'],
    nextKeyIndexes: initialNextKeyIndexes,
  });

  // cointype account (testnet & regtest)
  const defaultMainAccountXPubTestnet = makeAccountXPub(seed, Account.BASE_DERIVATION_PATH_TESTNET);
  await walletRepository.updateAccountDetails(MainAccountTest, {
    accountID: MainAccountTest,
    type: AccountType.P2WPKH,
    masterXPub: defaultMainAccountXPubTestnet,
    baseDerivationPath: Account.BASE_DERIVATION_PATH_TESTNET,
    accountNetworks: ['regtest', 'testnet'],
    nextKeyIndexes: initialNextKeyIndexes,
  });

  // legacy account
  const defaultLegacyMainAccountXPub = makeAccountXPub(seed, Account.BASE_DERIVATION_PATH_LEGACY);
  await walletRepository.updateAccountDetails(MainAccountLegacy, {
    accountID: MainAccountLegacy,
    type: AccountType.P2WPKH,
    masterXPub: defaultLegacyMainAccountXPub,
    baseDerivationPath: Account.BASE_DERIVATION_PATH_LEGACY,
    accountNetworks: ['liquid', 'regtest', 'testnet'],
    nextKeyIndexes: initialNextKeyIndexes,
  });
  return { masterBlindingKey, defaultMainAccountXPub, defaultLegacyMainAccountXPub };
}