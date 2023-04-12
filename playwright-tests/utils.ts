import type { BrowserContext, Page } from '@playwright/test';
import { test as basePlaywrightTest, chromium } from '@playwright/test';
import { generateMnemonic } from 'bip39';
import path from 'path';

export const test = basePlaywrightTest.extend<{
    context: BrowserContext;
    extensionId: string;
}>({
    // eslint-disable-next-line no-empty-pattern
    context: async ({ }, use) => {
        const pathToExtension = path.join(__dirname, '../dist', 'v3');
        const context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
        });
        await use(context);
        await context.close();
    },
    extensionId: async ({ context }, use) => {
        let extensionID = '';
        if (process.env.MANIFEST_VERSION === 'v2') {
            let [backgroundPage] = context.backgroundPages()
            if (!backgroundPage) backgroundPage = await context.waitForEvent('backgroundpage')
            extensionID = backgroundPage.url().split('/')[2]
        } else {
            let [serviceWorker] = context.serviceWorkers()
            if (!serviceWorker) serviceWorker = await context.waitForEvent('serviceworker')
            extensionID = serviceWorker.url().split('/')[2]
        }
        await use(extensionID);
    },
});

export const PASSWORD = 'passwordsupersecretonlyfortesting';

export const marinaURL = (extensionID: string, path: string) => `chrome-extension://${extensionID}/${path}`;

export const makeOnboardingRestore = async (page: Page, extensionID: string) => {
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

export const expect = test.expect;