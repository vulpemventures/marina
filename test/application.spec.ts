import { generateMnemonic, mnemonicToSeed } from 'bip39';
import * as ecc from 'tiny-secp256k1';
import { AssetHash, Extractor, networks, Pset, Transaction } from 'liquidjs-lib';
import { toOutputScript } from 'liquidjs-lib/src/address';
import type { AccountID, Address, IonioScriptDetails } from 'marina-provider';
import { AccountType } from 'marina-provider';
import {
  AccountFactory,
  MainAccount,
  MainAccountLegacy,
  MainAccountTest,
} from '../src/domain/account';
import { BlinderService } from '../src/domain/blinder';
import { SignerService } from '../src/domain/signer';
import { UpdaterService } from '../src/background/updater';
import { SubscriberService } from '../src/background/subscriber';
import {
  BlockstreamExplorerURLs,
  BlockstreamTestnetExplorerURLs,
  NigiriDefaultExplorerURLs,
} from '../src/domain/explorer';
import { AppStorageAPI } from '../src/infrastructure/storage/app-repository';
import { AssetStorageAPI } from '../src/infrastructure/storage/asset-repository';
import { WalletStorageAPI } from '../src/infrastructure/storage/wallet-repository';
import { initWalletRepository, makeAccountXPub } from '../src/infrastructure/utils';
import { computeBalances, PsetBuilder, SLIP13 } from '../src/utils';
import { faucet, sleep } from './_regtest';
import captchaArtifact from './fixtures/customscript/transfer_with_captcha.ionio.json';
import type { Artifact } from '@ionio-lang/ionio';
import {
  Contract,
  replaceArtifactConstructorWithArguments,
  templateString,
} from '@ionio-lang/ionio';
import { TaxiStorageAPI } from '../src/infrastructure/storage/taxi-repository';

// we need this to mock the browser.storage.local calls in repositories
jest.mock('webextension-polyfill');

const PASSWORD = 'PASSWORD';

const appRepository = new AppStorageAPI();
const walletRepository = new WalletStorageAPI();
const assetRepository = new AssetStorageAPI(walletRepository);
const taxiRepository = new TaxiStorageAPI(assetRepository, appRepository);
const psetBuilder = new PsetBuilder(walletRepository, appRepository, taxiRepository);

let factory: AccountFactory;
let mnemonic: string;

describe('Application Layer', () => {
  beforeAll(async () => {
    mnemonic = generateMnemonic();
    // set up a random wallet in repository
    // also set up default main Marina accounts
    await initWalletRepository(walletRepository, mnemonic, PASSWORD);
    await appRepository.setNetwork('regtest'); // switch to regtest
    await appRepository.setWebsocketExplorerURLs({
      liquid: BlockstreamExplorerURLs.websocketExplorerURL,
      regtest: NigiriDefaultExplorerURLs.websocketExplorerURL,
      testnet: BlockstreamTestnetExplorerURLs.websocketExplorerURL,
    });
    factory = await AccountFactory.create(walletRepository);
  });

  describe('Account', () => {
    describe('AccountFactory', () => {
      for (const ID of [MainAccount, MainAccountLegacy, MainAccountTest]) {
        test(`should create ${ID} account`, async () => {
          const account = await factory.make(ID === MainAccountTest ? 'regtest' : 'liquid', ID);
          expect(account).toBeDefined();
          expect(account.name).toEqual(ID);
        });
      }
    });

    describe('getNextAddress', () => {
      test('should update account details once external address is generated', async () => {
        const account = await factory.make('regtest', MainAccountTest);
        const index = (await walletRepository.getAccountDetails(MainAccountTest))[MainAccountTest]
          .nextKeyIndexes['regtest'].external;
        const address = await account.getNextAddress(false);
        expect(address).toBeDefined();
        const scriptFromAddress = toOutputScript(address.confidentialAddress).toString('hex');
        const scripts = Object.keys(
          await walletRepository.getAccountScripts('regtest', MainAccountTest)
        );
        const { [scriptFromAddress]: details } = await walletRepository.getScriptDetails(
          scriptFromAddress
        );
        expect(details).toBeDefined();
        expect(details.accountName).toEqual(MainAccountTest);
        expect(details.derivationPath).toEqual(address.derivationPath);
        expect(scripts).toContain(scriptFromAddress);
        const accountDetails = await walletRepository.getAccountDetails(MainAccountTest);
        expect(accountDetails[MainAccountTest]).toBeDefined();
        expect(accountDetails[MainAccountTest].nextKeyIndexes['regtest'].external).toEqual(
          index + 1
        );
      });

      test('should update account details once internal address is generated', async () => {
        const account = await factory.make('regtest', MainAccountTest);
        const index = (await walletRepository.getAccountDetails(MainAccountTest))[MainAccountTest]
          .nextKeyIndexes['regtest'].internal;
        const address = await account.getNextAddress(true);
        expect(address).toBeDefined();
        const scriptFromAddress = toOutputScript(address.confidentialAddress).toString('hex');
        const scripts = Object.keys(
          await walletRepository.getAccountScripts('regtest', MainAccountTest)
        );
        const { [scriptFromAddress]: details } = await walletRepository.getScriptDetails(
          scriptFromAddress
        );
        expect(details).toBeDefined();
        expect(details.accountName).toEqual(MainAccountTest);
        expect(details.derivationPath).toEqual(address.derivationPath);
        expect(scripts).toContain(scriptFromAddress);
        const accountDetails = await walletRepository.getAccountDetails(MainAccountTest);
        expect(accountDetails[MainAccountTest]).toBeDefined();
        expect(accountDetails[MainAccountTest].nextKeyIndexes['regtest'].internal).toEqual(
          index + 1
        );
      });
    });

    describe('sync', () => {
      test('should fail if the account type is AccountType.Ionio', async () => {
        const accountName = 'failTestIonioAccountSync';
        const path = SLIP13(accountName);
        const masterXPub = makeAccountXPub(await mnemonicToSeed(mnemonic), path);
        await walletRepository.updateAccountDetails(accountName, {
          accountID: accountName,
          accountNetworks: ['regtest'],
          type: AccountType.Ionio,
          baseDerivationPath: path,
          masterXPub,
        });
        const account = await factory.make('regtest', accountName);
        const chainSource = await appRepository.getChainSource('regtest');
        await sleep(2000);
        await expect(account.sync(chainSource!)).rejects.toThrowError(
          'Unsupported sync function for account type: ionio'
        );
        await chainSource?.close();
      });

      test('should restore an account with transactions (and unblind utxos via UpdaterService running in background)', async () => {
        // first let's start the UpdaterService running in background (simulating the background script UpdaterService)
        const zkpLib = await require('@vulpemventures/secp256k1-zkp')();
        const updater = new UpdaterService(
          walletRepository,
          appRepository,
          assetRepository,
          zkpLib
        );
        await updater.start();

        // then let's create a new random P2WPKH account
        const randomAccountName = 'randomAccountName' + Math.floor(Math.random() * 1000);
        const baseDerivationPath = SLIP13(randomAccountName);
        const masterXPub = makeAccountXPub(await mnemonicToSeed(mnemonic), baseDerivationPath);
        await walletRepository.updateAccountDetails(randomAccountName, {
          accountID: randomAccountName,
          accountNetworks: ['regtest'],
          type: AccountType.P2WPKH,
          baseDerivationPath,
          masterXPub,
          nextKeyIndexes: {
            liquid: { external: 0, internal: 0 },
            testnet: { external: 0, internal: 0 },
            regtest: { external: 18, internal: 2 }, // let's create some gap (the 18th address is the one we will use)
          },
        });

        // generate and faucet addresses
        let account = await factory.make('regtest', randomAccountName);
        const address = await account.getNextAddress(false);
        const txID0 = await faucet(address.confidentialAddress, 1);
        const txID1 = await faucet(address.confidentialAddress, 1);
        const addressBis = await account.getNextAddress(false);
        const txID2 = await faucet(addressBis.confidentialAddress, 1);
        const txID3 = await faucet(addressBis.confidentialAddress, 1);
        const changeAddress = await account.getNextAddress(true);
        const txID4 = await faucet(changeAddress.confidentialAddress, 1);
        const txID5 = await faucet(changeAddress.confidentialAddress, 1);
        await sleep(5000); // wait for the txs to be confirmed

        // then let's simulate re-onboarding by erasing the indexes (we "forget" the generated addresses)
        await walletRepository.updateAccountDetails(randomAccountName, {
          nextKeyIndexes: {
            liquid: { external: 0, internal: 0 },
            testnet: { external: 0, internal: 0 },
            regtest: { external: 0, internal: 0 },
          },
        });
        let accountDetails = await walletRepository.getAccountDetails(randomAccountName);
        expect(accountDetails[randomAccountName].nextKeyIndexes['regtest'].external).toEqual(0);
        expect(accountDetails[randomAccountName].nextKeyIndexes['regtest'].internal).toEqual(0);
        account = await factory.make('regtest', randomAccountName);
        const chainSource = await appRepository.getChainSource('regtest');
        const res = await account.sync(chainSource!, 20);
        await chainSource?.close();
        await updater.waitForProcessing();
        expect(res.next.external).toEqual(20);
        expect(res.next.internal).toEqual(3);

        accountDetails = await walletRepository.getAccountDetails(randomAccountName);
        expect(accountDetails[randomAccountName]).toBeDefined();
        expect(accountDetails[randomAccountName].nextKeyIndexes['regtest'].external).toEqual(20);
        expect(accountDetails[randomAccountName].nextKeyIndexes['regtest'].internal).toEqual(3);

        // check is the txs are here
        const txs = await walletRepository.getTransactions('regtest');
        expect(txs).toContain(txID0);
        expect(txs).toContain(txID1);
        expect(txs).toContain(txID2);
        expect(txs).toContain(txID3);
        expect(txs).toContain(txID4);
        expect(txs).toContain(txID5);
        // check the utxos
        const utxos = await walletRepository.getUtxos('regtest', randomAccountName);
        expect(utxos).toHaveLength(6);
        const balances = computeBalances(utxos);
        expect(balances).toEqual({
          [networks.regtest.assetHash]: 6_00_000_000,
        });
        await updater.stop();
      }, 20_000);
    });
  });

  describe('BlinderService & SignerService', () => {
    let accountName: AccountID;
    let ionioAccountName: AccountID;
    let captchaAddress: Address;

    beforeAll(async () => {
      const zkpLib = await require('@vulpemventures/secp256k1-zkp')();
      const updater = new UpdaterService(walletRepository, appRepository, assetRepository, zkpLib);
      const subscriber = new SubscriberService(walletRepository, appRepository);
      const seed = await mnemonicToSeed(mnemonic);
      await updater.start();
      await subscriber.start();

      accountName = 'signerServiceTestAccount' + Math.floor(Math.random() * 1000);
      const baseDerivationPath = SLIP13(accountName);
      const masterXPub = makeAccountXPub(seed, baseDerivationPath);
      await walletRepository.updateAccountDetails(accountName, {
        accountID: accountName,
        accountNetworks: ['regtest'],
        type: AccountType.P2WPKH,
        baseDerivationPath,
        masterXPub,
        nextKeyIndexes: {
          liquid: { external: 0, internal: 0 },
          testnet: { external: 0, internal: 0 },
          regtest: { external: 0, internal: 0 },
        },
      });

      ionioAccountName = 'signerServiceTestIonioAccount' + Math.floor(Math.random() * 1000);
      const baseIonioPath = SLIP13(ionioAccountName);
      const masterXPubIonio = makeAccountXPub(seed, baseIonioPath);
      await walletRepository.updateAccountDetails(ionioAccountName, {
        accountID: ionioAccountName,
        accountNetworks: ['regtest'],
        type: AccountType.Ionio,
        masterXPub: masterXPubIonio,
        baseDerivationPath: baseIonioPath,
        nextKeyIndexes: {
          liquid: { external: 0, internal: 0 },
          testnet: { external: 0, internal: 0 },
          regtest: { external: 0, internal: 0 },
        },
      });
      // faucet it
      const account = await factory.make('regtest', accountName);
      const address = await account.getNextAddress(false);
      await faucet(address.confidentialAddress, 1);
      await faucet(address.confidentialAddress, 1);

      // create the Ionio artifact address
      const ionioAccount = await factory.make('regtest', ionioAccountName);
      captchaAddress = await ionioAccount.getNextAddress(false, {
        artifact: replaceArtifactConstructorWithArguments(captchaArtifact as Artifact, [
          templateString('sum'),
          templateString(ionioAccountName),
        ]),
        args: { sum: 10 },
      });
      await faucet(captchaAddress.confidentialAddress, 1);
      await sleep(5000); // wait for the txs to be confirmed
      const chainSource = await appRepository.getChainSource('regtest');
      await account.sync(chainSource!, 20, { internal: 0, external: 0 });
      await chainSource?.close();
      await updater.stop();
      await subscriber.stop();
    }, 20_000);

    it('should sign all the accounts inputs (and blind outputs)', async () => {
      const zkpLib = await require('@vulpemventures/secp256k1-zkp')();
      const blinder = new BlinderService(walletRepository, zkpLib);
      const signer = await SignerService.fromPassword(walletRepository, appRepository, PASSWORD);
      const { pset } = await psetBuilder.createRegularPset(
        [
          {
            address:
              'el1qqge8cmyqh0ttlmukx3vrfx6escuwn9fp6vukug85m67qx4grus5llwvmctt7nr9vyzafy4ntn7l6y74cvvgywsmnnzg25x77e',
            asset: networks.regtest.assetHash,
            value: 200_000_000 - 10_0000,
          },
        ],
        [],
        [accountName]
      );

      const blindedPset = await blinder.blindPset(pset);
      const signedPset = await signer.signPset(blindedPset);
      const hex = signer.finalizeAndExtract(signedPset);
      expect(hex).toBeTruthy();
      const transaction = Transaction.fromHex(hex);
      expect(transaction.ins).toHaveLength(2);
      const chainSource = await appRepository.getChainSource('regtest');
      const txID = await chainSource?.broadcastTransaction(hex);
      await chainSource?.close();
      expect(txID).toEqual(transaction.getId());
    }, 10_000);

    describe('Ionio contract account', () => {
      it('transfer_with_captcha.ionio contract', async () => {
        const zkpLib = await require('@vulpemventures/secp256k1-zkp')();
        const signer = await SignerService.fromPassword(walletRepository, appRepository, PASSWORD);

        const contract = new Contract(
          (captchaAddress as unknown as IonioScriptDetails).artifact,
          (captchaAddress as unknown as IonioScriptDetails).params,
          networks.regtest,
          { ecc, zkp: zkpLib }
        );

        const utxo = (await walletRepository.getUtxos('regtest', ionioAccountName))[0];
        expect(utxo.blindingData).toBeTruthy();
        const witnessUtxo = await walletRepository.getWitnessUtxo(utxo.txID, utxo.vout);
        expect(witnessUtxo).toBeTruthy();

        const tx = contract
          .from(utxo.txID, utxo.vout, witnessUtxo!, {
            asset: AssetHash.fromHex(utxo.blindingData!.asset).bytesWithoutPrefix,
            value: utxo.blindingData!.value.toString(10),
            assetBlindingFactor: Buffer.from(utxo.blindingData!.assetBlindingFactor, 'hex'),
            valueBlindingFactor: Buffer.from(utxo.blindingData!.valueBlindingFactor, 'hex'),
          })
          .functions.transferWithSum(8, 2, {
            signTransaction: async (psetb64: string) => {
              const pset = Pset.fromBase64(psetb64);
              const signedPset = await signer.signPset(pset);
              return signedPset.toBase64();
            },
          })
          .withRecipient(
            'el1qqge8cmyqh0ttlmukx3vrfx6escuwn9fp6vukug85m67qx4grus5llwvmctt7nr9vyzafy4ntn7l6y74cvvgywsmnnzg25x77e',
            1_00_000_000 - 800,
            networks.regtest.assetHash,
            0
          )
          .withFeeOutput(800);

        const signed = await tx.unlock();
        const transaction = Extractor.extract(signed.pset);
        const hex = transaction.toHex();
        const chainSource = await appRepository.getChainSource('regtest');
        const txID = await chainSource?.broadcastTransaction(hex);
        await chainSource?.close();
        expect(txID).toEqual(transaction.getId());
      }, 12_000);

      it('should be able to restore using a restorationJSON', async () => {
        let ionioAccount = await factory.make('regtest', ionioAccountName);
        const restorationFile = await ionioAccount.restorationJSON();
        // delete the script details to simulate a "delete account" scenario
        await walletRepository.updateAccountDetails(ionioAccountName, {
          nextKeyIndexes: {
            liquid: { external: 0, internal: 0 },
            testnet: { external: 0, internal: 0 },
            regtest: { external: 0, internal: 0 },
          },
        });
        const { [ionioAccountName]: details } = await walletRepository.getAccountDetails(
          ionioAccountName
        );
        expect(details.nextKeyIndexes.regtest.external).toEqual(0);
        expect(details.nextKeyIndexes.regtest.internal).toEqual(0);

        ionioAccount = await factory.make('regtest', ionioAccountName);
        const chainSource = await appRepository.getChainSource('regtest');
        await ionioAccount.restoreFromJSON(chainSource!, restorationFile);
        await chainSource?.close();

        const { [ionioAccountName]: accountDetails } = await walletRepository.getAccountDetails(
          ionioAccountName
        );
        expect(accountDetails.nextKeyIndexes.regtest.external).toEqual(1);
        expect(accountDetails.nextKeyIndexes.regtest.internal).toEqual(0);

        const addresses = await ionioAccount.getAllAddresses();
        expect(addresses[0].confidentialAddress).toEqual(captchaAddress.confidentialAddress);
      }, 10_000);
    });
  });
});
