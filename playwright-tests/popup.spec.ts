import { address } from 'liquidjs-lib';
import { faucet } from '../test/_regtest';
import {
  test as pwTest,
  expect as pwExpect,
  makeOnboardingRestore,
  marinaURL,
  PASSWORD,
  switchToRegtestNetwork,
} from './utils';

pwTest(
  'should be able to generate a new address via wallet/receive popup UI & receive some funds',
  async ({ page, extensionId }) => {
    // onboard a new wallet
    await makeOnboardingRestore(page, extensionId);
    await switchToRegtestNetwork(page, extensionId); // switch to regtest

    await page.getByAltText('marina logo').click(); // go to home page
    await page.waitForSelector('text=Assets');
    // go to receive page and generate a new address
    await page.getByRole('button', { name: 'Receive' }).click();
    await page.getByRole('button', { name: 'New Asset' }).click();
    await page.getByRole('button', { name: 'Copy' }).click();
    await page.waitForSelector('text=Copied');
    // check clipboard value (should contain the confidential address)
    const clipboard = await page.evaluate('navigator.clipboard.readText()');
    pwExpect(typeof clipboard).toBe('string');
    pwExpect(clipboard).toContain('el1');
    pwExpect(address.isConfidential(clipboard as string)).toBe(true);

    // faucet
    const txid = await faucet(clipboard as string, 1); // send 1 L-BTC to the address
    await page.goto(marinaURL(extensionId, 'popup.html'));
    // wait to receive the funds
    await page.waitForSelector('text=1.00 000 000 L-BTC');

    await page.getByRole('button', { name: 'Liquid Bitcoin' }).click(); // go to L-BTC page
    // wait some time
    await page.getByRole('button', { name: '+1 L-BTC' }).click(); // click on tx
    await page.waitForSelector(`text=${txid}`); // check txid is displayed
    await page.waitForSelector('text=Inbound');
    await page.waitForSelector('text=1.00 000 000 L-BTC'); // check amount is displayed
    await page.waitForSelector('text=Fee');
  }
);

pwTest(
  'should be able to send some funds via wallet/send popup UI',
  async ({ page, extensionId }) => {
    await makeOnboardingRestore(page, extensionId); // create a new wallet
    await switchToRegtestNetwork(page, extensionId); // switch to regtest

    // go to receive page and generate a new address, we'll use it to faucet some funds
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.getByRole('button', { name: 'Receive' }).click();
    await page.getByRole('button', { name: 'New Asset' }).click();
    await page.getByRole('button', { name: 'Copy' }).click();
    await page.waitForSelector('text=Copied');
    const address = await page.evaluate('navigator.clipboard.readText()');
    pwExpect(address as string).toContain('el1');
    await faucet(address as string, 1); // send 1 L-BTC to the address
    await page.goto(marinaURL(extensionId, 'popup.html'));
    await page.waitForSelector('text=1.00 000 000 L-BTC');
    await page.getByRole('button', { name: 'Send' }).click(); // go to send
    await page.getByText('Liquid Bitcoin').click(); // select L-BTC
    await page.getByText('Liquid Network').click();
    await page
      .getByPlaceholder('el1...')
      .fill(
        'el1qq0vzd590j00zmmmnjajznkg52dw2st8drdnsxrh6gyd53g6yuf403fj26wlxtywylpxdx84vd67he6r059s0usrtlq73dyjpf'
      ); // fill the address with a random regtest address
    await page.getByPlaceholder('0').fill('0.9'); // fill the amount
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.getByRole('button', { name: 'L-BTC' }).click();
    await page.waitForSelector('text=Fee:');
    await page.getByRole('button', { name: 'Confirm' }).click(); // send
    await page.getByRole('button', { name: 'Send' }).click(); // confirm
    await page.waitForSelector('text=Unlock');
    await page.getByPlaceholder('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.waitForSelector('text=Payment successful!');
    await page.waitForTimeout(2000);

    await page.getByAltText('marina logo').click(); // go to home page
    // go to L-BTC page and check the tx is displayed
    await page.getByRole('button', { name: 'Liquid Bitcoin' }).click();
    await page.getByRole('button', { name: '-0.9 L-BTC' }).click();
    await page.waitForSelector('text=Outbound');
    await page.waitForSelector('text=0.9 L-BTC');
    await page.waitForSelector('text=Fee');
  }
);
