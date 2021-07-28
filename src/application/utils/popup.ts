import { browser } from 'webextension-polyfill-ts';

export async function setUpPopup(): Promise<void> {
  // set the popup after the onboarding flow
  await browser.browserAction.setPopup({ popup: 'popup.html' }).catch(console.error);
}
