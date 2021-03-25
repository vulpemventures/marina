import { browser, Idle } from 'webextension-polyfill-ts';
import { App } from '../domain/app/app';
import { setAsyncInterval, IDLE_MESSAGE_TYPE } from './utils';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/routes/constants';
import { repos } from '../infrastructure';
import { initPersistentStore } from '../infrastructure/init-persistent-store';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import Backend, { updateAllAssetInfos, updateUtxos } from './backend';

// MUST be > 15 seconds
const IDLE_TIMEOUT_IN_SECONDS = 300; // 5 minutes

let welcomeTabID: number | undefined = undefined;

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
        await initPersistentStore(repos);

        // this is for development only
        if (process.env.SKIP_ONBOARDING) {
          await browser.browserAction.setPopup({ popup: 'popup.html' });
          return;
        }

        // run onboarding flow on fullscreen
        welcomeTabID = await openInitializeWelcomeRoute();
        break;
      // TODO: on update, open new tab to tell users about the new features and any fixed issues
      // case 'update':
      //   {
      //     const url = browser.runtime.getURL('updated.html');
      //     browser.tabs.create({ url }).catch(console.log);
      //   }
      //   break;
    }
  })().catch(console.error);
});

browser.runtime.onStartup.addListener(() => {
  (async () => {
    // Everytime the browser starts up we need to set up the popup page
    await browser.browserAction.setPopup({ popup: 'popup.html' });
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
    const store = await browser.storage.local.get('wallets');
    if (store.wallets === undefined || store.wallets.length <= 0) {
      await initPersistentStore(repos);
      welcomeTabID = await openInitializeWelcomeRoute();
      return;
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
      new BrowserStorageAppRepo()
        .updateApp((app: App) => {
          app.props.isAuthenticated = false;
          return app;
        })
        .catch(console.error);
    }
  });
} catch (error) {
  console.error(error);
}

/**
 * Fetch and update utxos on recurrent basis
 * The alarms can be triggered every minute, not less
 * To give more frequent updates we use setInterval
 * However this can be killed randmoly by the browser
 * therefore we keep this local variable to check
 * if is going on. if not we will at least recover each
 * other minute when the alarm is fired off
 */

let utxosInterval: NodeJS.Timer | number | undefined;

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'UPDATE_UTXOS') {
    if (!utxosInterval) {
      utxosInterval = setAsyncInterval(async () => {
        await updateUtxos();
        await updateAllAssetInfos();
      }, 5000);
    }
  }
});

async function openInitializeWelcomeRoute(): Promise<number | undefined> {
  const url = browser.runtime.getURL(`home.html#${INITIALIZE_WELCOME_ROUTE}`);
  const { id } = await browser.tabs.create({ url });
  return id;
}

// We start listening and handling messages from injected script
const backend = new Backend();
backend.start();
