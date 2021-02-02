import { App } from './../domain/app/app';
import { IDLE_MESSAGE_TYPE } from './utils/idle';
import { browser, Idle } from 'webextension-polyfill-ts';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/routes/constants';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { initPersistentStore } from '../infrastructure/init-persistent-store';

// MUST be > 15 seconds
const IDLE_TIMEOUT_IN_SECONDS = 300; // 5 minutes

/**
 * Fired when the extension is first installed, when the extension is updated to a new version,
 * and when the browser is updated to a new version.
 * https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/
 */
let welcomeTabID: number | undefined = undefined;

browser.runtime.onInstalled.addListener(({ reason, temporary }) => {
  // skip onboarding
  // if (temporary) return;
  switch (reason) {
    //On first install, open new tab for onboarding
    case 'install': {
      const repos = {
        app: new BrowserStorageAppRepo(),
        wallet: new BrowserStorageWalletRepo(),
      };

      initPersistentStore(repos)
        .then(() =>
          openInitializeWelcomeRoute().then((id: number | undefined) => (welcomeTabID = id))
        )
        .catch((err) => console.log(err));

      break;
    }
    // TODO: on update, open new tab to tell users about the new features and any fixed issues
    // case 'update':
    //   {
    //     const url = browser.runtime.getURL('updated.html');
    //     browser.tabs.create({ url }).catch(console.log);
    //   }
    //   break;
  }
});

browser.browserAction.onClicked.addListener(() => {
  (async () => {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      for (const { windowId } of tabs) {
        if (windowId && windowId === welcomeTabID) return;
      }
      welcomeTabID = await openInitializeWelcomeRoute();
    } catch (error) {
      console.error(error);
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

async function openInitializeWelcomeRoute(): Promise<number | undefined> {
  const url = browser.runtime.getURL(`home.html#${INITIALIZE_WELCOME_ROUTE}`);
  const { windowId } = await browser.tabs.create({ url });
  return windowId;
}
