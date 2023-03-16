import type { Page } from '@playwright/test';
import { generateMnemonic } from 'bip39';
import { test as pwTest, expect as pwExpect } from './utils';

const PASSWORD = 'passwordsupersecretonlyfortesting';

const marinaURL = (extensionID: string, path: string) => `chrome-extension://${extensionID}/${path}`;

const makeOnboardingRestore = async (page: Page, extensionID: string) => {
  await page.goto(marinaURL(extensionID, 'home.html#initialize/welcome'));
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.getByRole('button', { name: 'Restore' }).click();

  const mnemonic = generateMnemonic();
  await page.getByRole('textbox', { name: 'mnemonic' }).fill(mnemonic);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByPlaceholder('Confirm your password').fill(PASSWORD);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForSelector('text=Your wallet is ready');
};

pwTest('should be able to create a new Marina wallet & Log in', async ({ page, extensionId }) => {
  await makeOnboardingRestore(page, extensionId);
  await page.goto(marinaURL(extensionId, 'popup.html'));
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForSelector('text=Assets');
});

pwTest('should be able to connect to a web app (faucet.vulpem.com)', async ({ page, extensionId, context }) => {
  await makeOnboardingRestore(page, extensionId);
  await page.goto('https://faucet.vulpem.com/');
  await page.getByRole('button', { name: 'Connect with Marina' }).click();
  const popup = await context.waitForEvent('page');
  await popup.getByRole('button', { name: 'Connect' }).click();
  pwExpect(page.getByText('Wrong network, switch to the Testnet')).toBeTruthy();
});
