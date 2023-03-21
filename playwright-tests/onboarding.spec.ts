import { test as pwTest, makeOnboardingRestore, marinaURL, PASSWORD } from "./utils";

pwTest('should be able to create a new Marina wallet & Log in', async ({ page, extensionId }) => {
  await makeOnboardingRestore(page, extensionId);
  await page.goto(marinaURL(extensionId, 'popup.html'));
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForSelector('text=Assets');
});
