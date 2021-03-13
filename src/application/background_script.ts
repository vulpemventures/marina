import { App } from '../domain/app/app';
import { IDLE_MESSAGE_TYPE } from './utils/idle';
import { browser, Idle, Runtime } from 'webextension-polyfill-ts';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/routes/constants';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { initPersistentStore } from '../infrastructure/init-persistent-store';
import { BrowserStorageAssetsRepo } from '../infrastructure/assets/browser-storage-assets-repository';

import Marina from './marina';
import { xpubWalletFromAddresses } from './utils/restorer';

// MUST be > 15 seconds
const IDLE_TIMEOUT_IN_SECONDS = 300; // 5 minutes

let welcomeTabID: number | undefined = undefined;

/**
 * Fired when the extension is first installed, when the extension is updated to a new version,
 * and when the browser is updated to a new version.
 * https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/
 */
browser.runtime.onInstalled.addListener(({ reason }) => {
  switch (reason) {
    //On first install, open new tab for onboarding
    case 'install': {
      const repos = {
        app: new BrowserStorageAppRepo(),
        assets: new BrowserStorageAssetsRepo(),
        wallet: new BrowserStorageWalletRepo(),
      };

      initPersistentStore(repos)
        .then(async () => {
          // Skip onboarding
          if (process.env.SKIP_ONBOARDING) {
            await browser.browserAction.setPopup({ popup: 'popup.html' }).catch(console.error);
          } else {
            return openInitializeWelcomeRoute().then(
              (id: number | undefined) => (welcomeTabID = id)
            );
          }
        })
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

// this listener only run IF AND ONLY IF the popup is not set
// popup is set at the end of onboarding workflow
browser.browserAction.onClicked.addListener(() => {
  (async () => {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      for (const { id } of tabs) {
        if (id && id === welcomeTabID) return;
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
  const { id } = await browser.tabs.create({ url });
  return id;
}


// start listening for connections from the content script and injected scripts
browser.runtime.onConnect.addListener((port: Runtime.Port) => {

  const handleResponse = (id: string, data: any) => {
    port.postMessage({ id, payload: { success: true, data } });
  };

  const handleError = (id: string, e: Error) => {
    port.postMessage({ id, payload: { success: false, error: e.message } });
  };
  // We listen for API calls from injected Marina provider. 
  // id is random identifier used as reference in the response
  // name is the name of the API method
  // params is the list of arguments from the method
  port.onMessage.addListener(async ({ id, name, params }: { id: string, name: string, params: any[] }) => {

    // TODO all this logic should eventually be moved somewhere else 

    switch (name) {

      case Marina.prototype.enable.name:

        return handleResponse(id, "requested website has been enabled");

      case Marina.prototype.getAddresses.name:

        try {
          const appRepo = new BrowserStorageAppRepo();
          const walletRepo = new BrowserStorageWalletRepo();

          const app = await appRepo.getApp();
          const wallet = await walletRepo.getOrCreateWallet();

          const xpub = await xpubWalletFromAddresses(
            wallet.masterXPub.value,
            wallet.masterBlindingKey.value,
            wallet.confidentialAddresses,
            app.network.value
          );

          const addrs = xpub.getAddresses();

          return handleResponse(id, addrs);
        } catch (e) {
          return handleError(id, e);
        }

      default:
        break;
    }
  });
});


