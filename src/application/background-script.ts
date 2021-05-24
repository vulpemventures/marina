import { browser, Idle } from 'webextension-polyfill-ts';
import { IDLE_MESSAGE_TYPE } from './utils';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/routes/constants';
import Backend from './backend';
import { logOut } from './redux/actions/app';
import { marinaStore, wrapMarinaStore } from './redux/store';
import { launchTxsUpdater } from './redux/actions/transaction';
import { launchUtxosUpdater } from './redux/actions/utxos';

// MUST be > 15 seconds
const IDLE_TIMEOUT_IN_SECONDS = 300; // 5 minutes
const UPDATE_ALARM = 'UPDATE_ALARM';
let welcomeTabID: number | undefined = undefined;

wrapMarinaStore(marinaStore); // wrap store to proxy store

browser.alarms.create(UPDATE_ALARM, {
  when: Date.now(),
  periodInMinutes: 5,
});

browser.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case UPDATE_ALARM:
      marinaStore.dispatch(launchTxsUpdater());
      marinaStore.dispatch(launchUtxosUpdater());
      break;

    default:
      break;
  }
});

// We start listening and handling messages from injected script
const backend = new Backend();
backend.start();

/**
 * Fired when the extension is first installed, when the extension is updated to a new version,
 * and when the browser is updated to a new version.
 * https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/
 */
browser.runtime.onInstalled.addListener(({ reason }) => {
  (async () => {
    switch (reason) {
      //On first install, open new tab for onboarding
      case 'install':
        // run onboarding flow on fullscreen
        welcomeTabID = await openInitializeWelcomeRoute();
        break;
    }
  })().catch(console.error);
});

// this listener only run IF AND ONLY IF the popup is not set
// popup is set at the end of onboarding workflow
browser.browserAction.onClicked.addListener(() => {
  (async () => {
    // here we prevent to open many onboarding pages fullscreen
    // in case we have one active already in the current tab
    const tabs = await browser.tabs.query({ currentWindow: true });
    for (const { id } of tabs) {
      if (id && id === welcomeTabID) return;
    }

    // in case the onboarding page is closed before finishing
    // the wallet creation process, we let user re-open it
    // Check if wallet exists in storage and if not we open the
    // onboarding page again.
    if (marinaStore.getState().wallet.encryptedMnemonic === '') {
      welcomeTabID = await openInitializeWelcomeRoute();
      return;
    } else {
      await browser.browserAction.setPopup({ popup: 'popup.html' });
      await browser.browserAction.openPopup();
    }
  })().catch(console.error);
});

try {
  // set the idle detection interval
  browser.idle.setDetectionInterval(IDLE_TIMEOUT_IN_SECONDS);
  // add listener on Idle API, sending a message if the new state isn't 'active'
  browser.idle.onStateChanged.addListener(function (newState: Idle.IdleState) {
    if (newState !== 'active') {
      browser.runtime.sendMessage(undefined, { type: IDLE_MESSAGE_TYPE }).catch(console.error);
      // this will handle the logout when the extension is closed
      marinaStore.dispatch(logOut());
    }
  });
} catch (error) {
  console.error(error);
}

async function openInitializeWelcomeRoute(): Promise<number | undefined> {
  const url = browser.runtime.getURL(`home.html#${INITIALIZE_WELCOME_ROUTE}`);
  const { id } = await browser.tabs.create({ url });
  return id;
}
