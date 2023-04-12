import type { MarinaProvider } from 'marina-provider';
import Marina from '../src/inject/marina/provider';
import { test as pwTest, expect as pwExpect, makeOnboardingRestore } from './utils';

const vulpemFaucetURL = 'https://faucet.vulpem.com/';

pwTest('should set up a window.marina object', async ({ page }) => {
    await page.goto(vulpemFaucetURL);
    // test if the window.marina object is set up
    // use isEnabled() to check if the functions are available
    const isEnableViaProvider = await page.evaluate(
      (name: string) => (window[name as any] as unknown as MarinaProvider).isEnabled(), 
      Marina.PROVIDER_NAME
    );
    pwExpect(isEnableViaProvider).toBe(false);
});

pwTest('should be able to connect to a web app (faucet.vulpem.com)', async ({ page, extensionId, context }) => {
  await makeOnboardingRestore(page, extensionId);
  await page.goto(vulpemFaucetURL);
  await page.getByRole('button', { name: 'Connect with Marina' }).click();
  const popup = await context.waitForEvent('page');
  await popup.getByRole('button', { name: 'Connect' }).click();
  pwExpect(page.getByText('Wrong network, switch to the Testnet')).toBeTruthy();
});
