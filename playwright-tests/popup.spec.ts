import { address } from 'liquidjs-lib';
import { faucet } from '../test/_regtest';
import {
  test as pwTest,
  expect as pwExpect,
  makeOnboardingRestore,
  marinaURL,
  PASSWORD,
} from './utils';

pwTest(
  'should be able to generate a new address via wallet/receive popup UI',
  async ({ page, extensionId }) => {
    // onboard a new wallet
    await makeOnboardingRestore(page, extensionId);
    // login page
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForSelector('text=Assets');
    // go to receive page and generate a new address
    await page.getByRole('button', { name: 'Receive' }).click();
    await page.getByRole('button', { name: 'New Asset' }).click();
    await page.getByRole('button', { name: 'Copy' }).click();
    await page.waitForSelector('text=Copied');
    const clipboard = await page.evaluate('navigator.clipboard.readText()');
    pwExpect(typeof clipboard).toBe('string');
    pwExpect(clipboard).toContain('lq1');
    pwExpect(address.isConfidential(clipboard as string)).toBe(true);
  }
);

pwTest.only(
  'should be able to send some funds via wallet/send popup UI',
  async ({ page, extensionId }) => {
    await makeOnboardingRestore(page, extensionId); // create a new wallet
    // go to networks page and switch to regtest
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForSelector('text=Assets');
    await page.getByAltText('menu icon').click(); // hamburger menu
    await page.getByText('Settings').click();
    await page.getByRole('button', { name: 'Networks' }).click();
    await page.getByRole('button', { name: 'Liquid' }).click(); // by default on Liquid, so the button contains the network name
    await page.getByText('Regtest').click();
    // wait some time for the network to switch
    await page.waitForTimeout(2000);

    // go to receive page and generate a new address, we'll use it to faucet some funds
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.getByRole('button', { name: 'Receive' }).click();
    await page.getByRole('button', { name: 'New Asset' }).click();
    await page.getByRole('button', { name: 'Copy' }).click();
    await page.waitForSelector('text=Copied');
    const address = await page.evaluate("navigator.clipboard.readText()");
    pwExpect(address as string).toContain('el1');
    await faucet(address as string, 1); // send 1 L-BTC to the address
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.waitForSelector('text=1 L-BTC');
    await page.getByRole('button', { name: 'Send' }).click(); // go to send
    await page.getByText('Liquid Bitcoin').click(); // select L-BTC
    await page.getByPlaceholder('lq1...').fill(address as string); // fill the address
    await page.getByPlaceholder('0').fill('0.9'); // fill the amount
    await page.getByRole('button', { name: 'Verify' }).click(); 
    await page.getByRole('button', { name: 'L-BTC' }).click(); 
    await page.waitForSelector('text=Fee:');
    await page.getByRole('button', { name: 'Confirm' }).click(); // send
    await page.getByRole('button', { name: 'Send' }).click(); // confirm
    await page.waitForSelector('text=Unlock');
    await page.getByPlaceholder('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.waitForSelector('text=Payment successful !');
  }
);
