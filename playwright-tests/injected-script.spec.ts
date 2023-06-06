import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { Creator, Transaction, Updater, address, networks } from 'liquidjs-lib';
import {
  test as pwTest,
  expect as pwExpect,
  makeOnboardingRestore,
  PlaywrightMarinaProvider,
  marinaURL,
  PASSWORD,
} from './utils';
import { faucet } from '../test/_regtest';
import type { Artifact} from '@ionio-lang/ionio';
import { Contract } from '@ionio-lang/ionio';
import { AccountType } from 'marina-provider';
import captchaArtifact from '../test/fixtures/customscript/transfer_with_captcha.ionio.json';

const vulpemFaucetURL = 'https://faucet.vulpem.com/';

pwTest('should set up a window.marina object', async ({ page }) => {
  await page.goto(vulpemFaucetURL);
  // test if the window.marina object is set up
  // use isEnabled() to check if the functions are available
  const isEnableViaProvider = await new PlaywrightMarinaProvider(page).isEnabled();
  pwExpect(isEnableViaProvider).toBe(false);
});

pwTest(
  'should be able to connect to a web app (faucet.vulpem.com)',
  async ({ page, extensionId, context }) => {
    await makeOnboardingRestore(page, extensionId);
    await page.goto(vulpemFaucetURL);
    await page.getByRole('button', { name: 'Connect with Marina' }).click();
    const popup = await context.waitForEvent('page');
    await popup.getByRole('button', { name: 'Connect' }).click();
    pwExpect(page.getByText('Wrong network, switch to the Testnet')).toBeTruthy();
    const provider = new PlaywrightMarinaProvider(page);
    pwExpect(await provider.isEnabled()).toBe(true);
  }
);

pwTest(
  'marina.importScript should update the script utxo set',
  async ({ page, extensionId, context }) => {
    await makeOnboardingRestore(page, extensionId);
    // login and switch to regtest network
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForSelector('text=Assets');
    await page.getByAltText('menu icon').click(); // hamburger menu
    await page.getByText('Settings').click();
    await page.getByRole('button', { name: 'Networks' }).click();
    await page.getByRole('button', { name: 'Liquid' }).click(); // by default on Liquid, so the button contains the network name
    await page.getByText('Regtest').click();

    await page.goto(vulpemFaucetURL);
    const provider = new PlaywrightMarinaProvider(page);
    if (!(await provider.isEnabled())) {
      await page.getByRole('button', { name: 'Connect with Marina' }).click();
      const popup = await context.waitForEvent('page');
      await popup.getByRole('button', { name: 'Connect' }).click();
    }

    const handleCreatePopup = async () => {
      const popup = await context.waitForEvent('page');
      await popup.waitForSelector(`text=Ionio`);
      await popup.getByRole('button', { name: 'Accept' }).click();
      // fill password
      await popup.getByPlaceholder('Password').fill(PASSWORD);
      await popup.getByRole('button', { name: 'Unlock' }).click();
    };

    await Promise.all([
      pwExpect(provider.createAccount('ionio', AccountType.Ionio)).resolves.toBeTruthy(),
      handleCreatePopup(),
    ]);

    const zkpLib = await require('@vulpemventures/secp256k1-zkp')();

    const ecpair = ECPairFactory(ecc)
    const keyPair = ecpair.makeRandom();
    const blindingKeyPair = ecpair.makeRandom();

    const contract = new Contract(
      captchaArtifact as Artifact,
      [10, `0x${keyPair.publicKey.subarray(1).toString('hex')}`],
      networks.regtest,
      zkpLib
    );

   
    const contractScript = contract.scriptPubKey.toString('hex');
    await pwExpect(
      provider.importScript('ionio', contractScript, blindingKeyPair.privateKey!.toString('hex'))
    ).resolves.toBeUndefined();

    // faucet
    const txid = await faucet(contract.address, 1); // send 1 L-BTC to the contract address

    // sleep some times
    await page.waitForTimeout(5000);

    const coins = await provider.getCoins(['ionio']);

    // should receive the faucet tx
    pwExpect(coins.length).toBe(1);
    pwExpect(coins[0].txid).toBe(txid);

    // should be correctly unblinded
    pwExpect(coins[0].blindingData).toBeTruthy();
    pwExpect(coins[0].blindingData!.asset).toEqual(networks.regtest.assetHash);
    pwExpect(coins[0].blindingData!.value).toEqual(1_0000_0000);
  }
);

pwTest(
  'marina.signTransaction popup should display the correct amount of spent asset',
  async ({ page, extensionId, context }) => {
    await makeOnboardingRestore(page, extensionId);
    // login and switch to regtest network
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForSelector('text=Assets');
    await page.getByAltText('menu icon').click(); // hamburger menu
    await page.getByText('Settings').click();
    await page.getByRole('button', { name: 'Networks' }).click();
    await page.getByRole('button', { name: 'Liquid' }).click(); // by default on Liquid, so the button contains the network name
    await page.getByText('Regtest').click();

    await page.goto(vulpemFaucetURL);
    let provider = new PlaywrightMarinaProvider(page);
    if (!(await provider.isEnabled())) {
      await page.getByRole('button', { name: 'Connect with Marina' }).click();
      const popup = await context.waitForEvent('page');
      await popup.getByRole('button', { name: 'Connect' }).click();
    }
    const toFaucet = await provider.getNextAddress();

    if (toFaucet.confidentialAddress === undefined) {
      throw new Error('toFaucet.confidentialAddress is undefined');
    }

    await faucet(toFaucet.confidentialAddress, 1); // send 1 L-BTC to the address
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.waitForSelector('text=1 L-BTC');

    await page.goto(vulpemFaucetURL);
    provider = new PlaywrightMarinaProvider(page);
    const [coin] = await provider.getCoins();
    // random regtest address
    const receiver =
      'el1qqdfjtdv5a7jez0qmj5g4u07pcg0qsm8jrwx0c6rza8kmquad2k62mwxw92f7vw0460wdx36m97er86rlkl3xsz774h2w3zpc9';

    const pset = Creator.newPset();
    const updater = new Updater(pset);
    pwExpect(coin.blindingData).toBeTruthy();
    pwExpect(coin.blindingData!.asset).toEqual(networks.regtest.assetHash);
    pwExpect(coin.blindingData!.value).toEqual(1_0000_0000);
    updater.addInputs([
      {
        txid: coin.txid,
        txIndex: coin.vout,
        witnessUtxo: coin.witnessUtxo,
        sighashType: Transaction.SIGHASH_ALL,
      },
    ]);
    updater.addOutputs([
      {
        amount: coin.blindingData!.value - 1500,
        asset: networks.regtest.assetHash,
        script: address.toOutputScript(receiver),
        blinderIndex: 0,
        blindingPublicKey: address.fromConfidential(receiver).blindingKey,
      },
      {
        amount: 1500,
        asset: networks.regtest.assetHash,
      },
    ]);

    const psetBase64 = pset.toBase64();

    const handleSignTransactionPopup = async () => {
      const popup = await context.waitForEvent('page');
      await popup.waitForSelector(`text=1 L-BTC`);
      await popup.getByRole('button', { name: 'Reject' }).click();
    };

    await Promise.all([
      pwExpect(provider.signTransaction(psetBase64)).rejects.toThrow(
        'User rejected the sign request'
      ),
      handleSignTransactionPopup(),
    ]);
  }
);
