import { Creator, Transaction, Updater, address, networks } from 'liquidjs-lib';
import {
  test as pwTest,
  expect as pwExpect,
  makeOnboardingRestore,
  PlaywrightMarinaProvider,
  marinaURL,
  switchToRegtestNetwork,
} from './utils';
import { faucet } from '../test/_regtest';

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

    const address = await provider.getNextAddress();
    pwExpect(address).toBeTruthy();
    pwExpect(address.confidentialAddress).toBeTruthy();
    pwExpect(address.blindingPrivateKey).toBeTruthy();
    pwExpect(address.publicKey).toBeTruthy();
    pwExpect(address.script).toBeTruthy();
  }
);

pwTest(
  'marina.signTransaction popup should display the correct amount of spent asset',
  async ({ page, extensionId, context }) => {
    await makeOnboardingRestore(page, extensionId);
    await switchToRegtestNetwork(page, extensionId); 

    await page.goto(vulpemFaucetURL);
    let provider = new PlaywrightMarinaProvider(page);
    if (!(await provider.isEnabled())) {
      await page.getByRole('button', { name: 'Connect with Marina' }).click();
      const popup = await context.waitForEvent('page');
      await popup.getByRole('button', { name: 'Connect' }).click();
    }
    const toFaucet = await provider.getNextAddress();
    if (!toFaucet.confidentialAddress) throw new Error('confidentialAddress is undefined');
    await faucet(toFaucet.confidentialAddress, 1); // send 1 L-BTC to the address
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.waitForSelector('text=1 L-BTC');

    await page.goto(vulpemFaucetURL);
    provider = new PlaywrightMarinaProvider(page);
    const [coin] = await provider.getCoins();
    // random regtest address
    const receiver = 'el1qqdfjtdv5a7jez0qmj5g4u07pcg0qsm8jrwx0c6rza8kmquad2k62mwxw92f7vw0460wdx36m97er86rlkl3xsz774h2w3zpc9'
    
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
      await popup.waitForSelector(`text= L-BTC`); // wait for loading to finish
      const value = popup.getByTestId(networks.regtest.assetHash)
      pwExpect(value).toBeTruthy();
      pwExpect(await value.innerText()).toEqual('0.999985');
      await popup.getByRole('button', { name: 'Reject' }).click();
    };

    await Promise.all([
      pwExpect(provider.signTransaction(psetBase64)).rejects.toThrow('User rejected the sign request'),
      handleSignTransactionPopup(),
    ]);
  }
);

pwTest(
  'marina.sendTransaction popup should display the correct amount of spent asset',
  async ({ page, extensionId, context }) => {
    await makeOnboardingRestore(page, extensionId);
    await switchToRegtestNetwork(page, extensionId); 

    await page.goto(vulpemFaucetURL);
    let provider = new PlaywrightMarinaProvider(page);
    if (!(await provider.isEnabled())) {
      await page.getByRole('button', { name: 'Connect with Marina' }).click();
      const popup = await context.waitForEvent('page');
      await popup.getByRole('button', { name: 'Connect' }).click();
    }
    const toFaucet = await provider.getNextAddress();
    if (!toFaucet.confidentialAddress) throw new Error('confidentialAddress is undefined');
    await faucet(toFaucet.confidentialAddress, 1); // send 1 L-BTC to the address
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.waitForSelector('text=1 L-BTC');

    await page.goto(vulpemFaucetURL);
    provider = new PlaywrightMarinaProvider(page);
    // random regtest address
    const receiver = 'el1qqdfjtdv5a7jez0qmj5g4u07pcg0qsm8jrwx0c6rza8kmquad2k62mwxw92f7vw0460wdx36m97er86rlkl3xsz774h2w3zpc9'
    const recipients = [
      { 
        address: receiver,
        asset: networks.regtest.assetHash,
        value: 1_0000_0000 - 1500,
      }
    ];

    const handleSendTransactionPopup = async () => {
      const popup = await context.waitForEvent('page');
      await popup.waitForSelector(`text= L-BTC`); // wait for loading to finish
      const value = popup.getByTestId(networks.regtest.assetHash)
      pwExpect(value).toBeTruthy();
      pwExpect(await value.innerText()).toEqual('0.999985');
      const btn = popup.getByRole('button', { name: 'Reject' })
      pwExpect(btn).toBeTruthy();
      await btn.click();
    };

    await Promise.all([
      pwExpect(provider.sendTransaction(recipients)).rejects.toThrow('user rejected the sendTransaction request'),
      handleSendTransactionPopup(),
    ]);
  }
);
