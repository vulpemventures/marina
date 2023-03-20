import type { BrowserContext } from '@playwright/test';
import { test as basePlaywrightTest, chromium } from '@playwright/test';
import path from 'path';

export const test = basePlaywrightTest.extend<{
    context: BrowserContext;
    extensionId: string;
}>({
    // eslint-disable-next-line no-empty-pattern
    context: async ({ }, use) => {
        const pathToExtension = path.join(__dirname, '../dist');
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

export const expect = test.expect;