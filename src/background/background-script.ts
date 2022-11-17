import SafeEventEmitter from '@metamask/safe-event-emitter';
import browser from 'webextension-polyfill';
import { testWalletData, testPasswordHash } from '../application/constants/cypress';
import { logOut, onboardingCompleted } from '../application/redux/actions/app';
import { enableWebsite } from '../application/redux/actions/connect';
import { setAccount, setEncryptedMnemonic } from '../application/redux/actions/wallet';
import { selectEncryptedMnemonic } from '../application/redux/selectors/wallet.selector';
import { marinaStore, rehydration, wrapMarinaStore } from '../application/redux/store';
import { tabIsOpen } from '../application/utils/common';
import { setUpPopup } from '../application/utils/popup';
import { MainAccountID } from '../domain/account';
import type { OpenPopupMessage, PopupName } from '../domain/message';
import {
  isReloadAccountsSubscribtionsMessage,
  isSubscribeScriptsMessage,
  isOpenPopupMessage,
  isPopupResponseMessage,
} from '../domain/message';
import { POPUP_RESPONSE } from '../presentation/connect/popupBroker';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/routes/constants';
import { periodicTaxiUpdater } from './alarms';
import { WebsocketManager } from './websocket-manager';

// MUST be > 15 seconds
const IDLE_TIMEOUT_IN_SECONDS = 300; // 5 minutes
let welcomeTabID: number | undefined = undefined;

// wrap background store to proxy stores in popup and content scripts
// MUST be called before any other store access
wrapMarinaStore(marinaStore);

const websocketsManager = new WebsocketManager(
  {
    regtest: 'ws://localhost:1234',
    testnet: 'wss://esplora.blockstream.com/liquidtestnet/electrum-websocket/api',
    liquid: 'wss://esplora.blockstream.com/liquid/electrum-websocket/api',
  },
  marinaStore
);

export async function reloadAccountsSubscriptions() {
  await rehydration();
  await websocketsManager.initScriptSubscriptions();
}

reloadAccountsSubscriptions().catch(console.error);

/**
 * Fired when the extension is first installed, when the extension is updated to a new version,
 * and when the browser is updated to a new version.
 * https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/
 */
browser.runtime.onInstalled.addListener(({ reason }) => {
  (async () => {
    switch (reason) {
      //On first install, open new tab for onboarding
      case 'install': {
        // /!\ skip onboarding in test env
        if (process.env.NODE_ENV === 'test') {
          marinaStore.dispatch(
            setEncryptedMnemonic(testWalletData.encryptedMnemonic, testPasswordHash)
          );
          marinaStore.dispatch(setAccount(MainAccountID, testWalletData));
          marinaStore.dispatch(enableWebsite('vulpemventures.github.io', 'regtest')); // skip the enable step too
          await setUpPopup();
          marinaStore.dispatch(onboardingCompleted());
          break;
        }
        // run onboarding flow on fullscreen
        welcomeTabID = await openInitializeWelcomeRoute();
        break;
      }
      case 'update': {
        if (marinaStore?.getState()?.app?.isOnboardingCompleted) {
          // After an update, and only if the user is already onboarded,
          // we need the setup the popup or the first click on the
          // extension icon will do nothing
          await setUpPopup();
          // After an update, all previous periodic updaters are lost.
          // Re-enable them if the user is already onboarded
          periodicTaxiUpdater();
        }
      }
    }
  })().catch(console.error);
});

// /!\ FIX: prevent opening the onboarding page if the browser has been closed
browser.runtime.onStartup.addListener(() => {
  (async () => {
    await reloadAccountsSubscriptions();
    if (selectEncryptedMnemonic(marinaStore.getState()) === '') {
      // Everytime the browser starts up we need to set up the popup page
      await browser.browserAction.setPopup({ popup: 'popup.html' });
      // Set up the periodic updaters if user is onboarded
      periodicTaxiUpdater();
    }
  })().catch(console.error);
});

// this listener only run IF AND ONLY IF the popup is not set
// popup is set at the end of onboarding workflow
browser.browserAction.onClicked.addListener(() => {
  (async () => {
    // here we prevent to open many onboarding pages fullscreen
    // in case we have one active already in the current tab
    if (welcomeTabID && (await tabIsOpen(welcomeTabID))) return;

    // in case the onboarding page is closed before finishing
    // the wallet creation process, we let user re-open it
    // Check if wallet exists in storage and if not we open the
    // onboarding page again.
    if (selectEncryptedMnemonic(marinaStore.getState()) === '') {
      welcomeTabID = await openInitializeWelcomeRoute();
      return;
    } else {
      await browser.browserAction.setPopup({ popup: 'popup.html' });
      // Function browser.browserAction.openPopup() exists in Firefox but not in Chrome
      if (browser.browserAction.openPopup) await browser.browserAction.openPopup();
    }
  })().catch(console.error);
});

// the event emitter is used to link all the content-scripts (popups and providers ones)
const eventEmitter = new SafeEventEmitter();

browser.runtime.onConnect.addListener((port: browser.Runtime.Port) => {
  port.onMessage.addListener((message: any) => {
    console.log('background: message received', message);
    if (isOpenPopupMessage(message)) {
      handleOpenPopupMessage(message, port).catch((error: any) => {
        console.error(error);
        port.postMessage({ data: undefined });
      });
      return;
    }

    if (isPopupResponseMessage(message)) {
      // propagate popup response
      eventEmitter.emit(POPUP_RESPONSE, message.data);
    }

    if (isSubscribeScriptsMessage(message)) {
      for (const script of message.scripts) {
        websocketsManager
          .subscribeScript(message.network, message.accountID, script)
          .catch(console.error);
      }
    }

    if (isReloadAccountsSubscribtionsMessage(message)) {
      reloadAccountsSubscriptions().catch(console.error);
    }
  });
});

// Open the popup window and wait for a response
// then forward the response to content-script
async function handleOpenPopupMessage(message: OpenPopupMessage, port: browser.Runtime.Port) {
  await createBrowserPopup(message.name);
  eventEmitter.once(POPUP_RESPONSE, (data: any) => {
    port.postMessage(data);
  });
}

try {
  // set the idle detection interval
  browser.idle.setDetectionInterval(IDLE_TIMEOUT_IN_SECONDS);
  // add listener on Idle API, sending a message if the new state isn't 'active'
  browser.idle.onStateChanged.addListener(function (newState: browser.Idle.IdleState) {
    console.debug('Idle state changed to ' + newState);
    switch (newState) {
      case 'active':
        reloadAccountsSubscriptions().catch(console.error);
        break;
      default:
        marinaStore.dispatch(logOut());
        break;
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

const POPUP_HTML = 'popup.html';
const POPUP_HEIGHT = 600;
const POPUP_WIDTH = 360;

async function createBrowserPopup(name?: PopupName) {
  let _left = 0;
  let _top = 0;
  try {
    // Position popup in top right corner of window.
    const { left, top, width } = await browser.windows.getLastFocused();
    if (typeof left !== 'undefined' && typeof top !== 'undefined' && typeof width !== 'undefined') {
      _top = top;
      _left = left + (width - POPUP_WIDTH);
    }
  } catch (_) {
    // The following properties are more than likely to be 0
    const { screenX, screenY, outerWidth } = window;
    _top = Math.max(screenY, 0);
    _left = Math.max(screenX + (outerWidth - POPUP_WIDTH), 0);
  }
  const options = {
    url: `${POPUP_HTML}#/connect/${name}`,
    type: 'popup',
    height: POPUP_HEIGHT,
    width: POPUP_WIDTH,
    focused: true,
    left: _left,
    top: _top,
  };
  await browser.windows.create(options as any);
}
