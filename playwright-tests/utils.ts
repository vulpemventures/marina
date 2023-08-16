import type { BrowserContext, Page } from '@playwright/test';
import { test as basePlaywrightTest, chromium } from '@playwright/test';
import { generateMnemonic } from 'bip39';
import type {
  AccountInfo,
  AccountType,
  Address,
  ArtifactWithConstructorArgs,
  Balance,
  MarinaEventType,
  MarinaProvider,
  NetworkString,
  Recipient,
  SentTransaction,
  SignedMessage,
  Transaction,
  Utxo,
} from 'marina-provider';
import path from 'path';
import Marina from '../src/inject/marina/provider';

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

export const marinaURL = (extensionID: string, path: string) =>
  `chrome-extension://${extensionID}/${path}`;

export const switchToRegtestNetwork = async (page: Page, extensionID: string) => {
// go to networks page and switch to regtest
    await page.goto(marinaURL(extensionID, 'popup.html'));
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
}

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

// detects { '0': x, '1': y, ... } shape of Uint8Array
function isSpecialUint8Array(value: unknown): value is Record<string, number> {
  return typeof value === 'object' &&
    value !== null &&
    Object.keys(value).every((k) => /^\d+$/.test(k)) &&
    Object.values(value).every((v) => typeof v === 'number' && v >= 0 && v <= 255);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// we need this to handle special shape of Buffer in the Playwright 'evaluate' environment
function bufferCast<T extends Record<string, any>>(obj: T): T {
  // cast all { '0': x, '1': y, ... } to Buffer
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      isObject(v) ? (isSpecialUint8Array(v) ? Buffer.from(Object.values(v)) : bufferCast(v)) : v,
    ])
  ) as T;
}

// lets to call marina provider function in the current page
// implements only the methods that are used in the tests
export class PlaywrightMarinaProvider implements MarinaProvider {
  constructor(private page: Page) {}

  enable(): Promise<void> {
    return this.page.evaluate(
      (name: string) => (window[name as any] as unknown as MarinaProvider).enable(),
      Marina.PROVIDER_NAME
    );
  }
  disable(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  isEnabled(): Promise<boolean> {
    return this.page.evaluate(
      (name: string) => (window[name as any] as unknown as MarinaProvider).isEnabled(),
      Marina.PROVIDER_NAME
    );
  }
  isReady(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  on(type: MarinaEventType, callback: (payload: any) => void): string {
    throw new Error('Method not implemented.');
  }
  off(listenerId: string): void {
    throw new Error('Method not implemented.');
  }
  getNetwork(): Promise<NetworkString> {
    throw new Error('Method not implemented.');
  }
  getFeeAssets(): Promise<string[]> {
    throw new Error('Method not implemented.');
  }
  getSelectedAccount(): Promise<string> {
    throw new Error('Method not implemented.');
  }
  getAccountsIDs(): Promise<string[]> {
    throw new Error('Method not implemented.');
  }
  getAccountInfo(accountID: string): Promise<AccountInfo> {
    throw new Error('Method not implemented.');
  }
  createAccount(accountID: string, accountType: AccountType): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getBalances(accountIDs?: string[] | undefined): Promise<Balance[]> {
    throw new Error('Method not implemented.');
  }
  async getCoins(accountIDs?: string[] | undefined): Promise<Utxo[]> {
    const coins = await this.page.evaluate<Utxo[], string[]>(
      ([name, ...accountIDs]) =>
        (window[name as any] as unknown as MarinaProvider).getCoins(accountIDs),
      [Marina.PROVIDER_NAME, ...(accountIDs || [])]
    );
    return coins.map(bufferCast);
  }
  getTransactions(accountIDs?: string[] | undefined): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }
  getAddresses(accountIDs?: string[] | undefined): Promise<Address[]> {
    throw new Error('Method not implemented.');
  }

  sendTransaction(
    recipients: Recipient[],
    feeAsset?: string
  ): Promise<SentTransaction> {
    return this.page.evaluate<SentTransaction, [string, Recipient[], string | undefined]>(
      ([name, recipients, feeAsset]) => (window[name as any] as unknown as MarinaProvider).sendTransaction(recipients, feeAsset),
      [Marina.PROVIDER_NAME, recipients, feeAsset]
    );
  }
  
  signTransaction(pset: string): Promise<string> {
    return this.page.evaluate<string, [string, string]>(
      ([name, pset]) => (window[name as any] as unknown as MarinaProvider).signTransaction(pset),
      [Marina.PROVIDER_NAME, pset]
    );
  }
  broadcastTransaction(signedTxHex: string): Promise<SentTransaction> {
    throw new Error('Method not implemented.');
  }
  blindTransaction(pset: string): Promise<string> {
    return this.page.evaluate<string, [string, string]>(
      ([name, pset]) => (window[name as any] as unknown as MarinaProvider).blindTransaction(pset),
      [Marina.PROVIDER_NAME, pset]
    );
  }
  useAccount(accountID: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  getNextAddress(ionioArtifact?: ArtifactWithConstructorArgs | undefined): Promise<Address> {
    return this.page.evaluate<Address, [string, ArtifactWithConstructorArgs | undefined]>(
      ([name, ionioArtifact]) =>
        (window[name as any] as unknown as MarinaProvider).getNextAddress(ionioArtifact),
      [Marina.PROVIDER_NAME, ionioArtifact]
    );
  }
  getNextChangeAddress(ionioArtifact?: ArtifactWithConstructorArgs | undefined): Promise<Address> {
    throw new Error('Method not implemented.');
  }
  signMessage(message: string): Promise<SignedMessage> {
    throw new Error('Method not implemented.');
  }
}
