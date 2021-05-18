import { browser } from 'webextension-polyfill-ts';

/**
 * Once we finished the onboarding we trigger provisioning
 * function to initialzied the background script
 */
export async function provisionBackgroundScript(): Promise<void> {
  // set the popup after the onboarding flow
  await browser.browserAction.setPopup({ popup: 'popup.html' }).catch(console.error);
}
