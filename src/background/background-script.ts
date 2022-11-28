import SafeEventEmitter from '@metamask/safe-event-emitter';
import browser from 'webextension-polyfill';
import { testWalletData, testPasswordHash } from '../application/constants/cypress';
import {
  RESET_APP,
  RESET_CONNECT,
  RESET_TAXI,
  RESET_WALLET,
} from '../application/redux/actions/action-types';
import { logOut, onboardingCompleted } from '../application/redux/actions/app';
import { enableWebsite } from '../application/redux/actions/connect';
import { setAccount, setEncryptedMnemonic } from '../application/redux/actions/wallet';
import { selectNetwork } from '../application/redux/selectors/app.selector';
import { selectEncryptedMnemonic } from '../application/redux/selectors/wallet.selector';
import { marinaStore, rehydration, wrapMarinaStore } from '../application/redux/store';
import { tabIsOpen } from '../application/utils/common';
import { setUpPopup } from '../application/utils/popup';
import { MainAccountID } from '../domain/account';
import type { OpenPopupMessage, PopupName } from '../domain/message';
import {
  forceUpdateResponseMessage,
  isForceUpdateMessage,
  isForceUpdateResponseMessage,
  isRestoreAccountTaskResponseMessage,
  isStartWebSocketMessage,
  restoreAccountTaskResponseMessage,
  isResetMessage,
  isRestoreAccountTaskMessage,
  isSubscribeScriptsMessage,
  isOpenPopupMessage,
  isPopupResponseMessage,
} from '../domain/message';
import { POPUP_RESPONSE } from '../presentation/connect/popupBroker';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/routes/constants';
import { extractErrorMessage } from '../presentation/utils/error';
import { Alarm, setPeriodicTask } from './alarms';
import { DeepRestorerService } from './deep-restorer';
import { fetchTaxiAssetsForNetwork } from './taxi';
import { WebsocketManager } from './websocket-manager';

// MUST be > 15 seconds
const IDLE_TIMEOUT_IN_SECONDS = 300; // 5 minutes
let welcomeTabID: number | undefined = undefined;

// wrap background store to proxy stores in popup and content scripts
// MUST be called before any other store access
wrapMarinaStore(marinaStore);

let websocketsManager: WebsocketManager;

rehydration()
  .then(() => {
    websocketsManager = new WebsocketManager(marinaStore);
    const state = marinaStore.getState();
    websocketsManager.start(selectNetwork(state)).catch(console.error);
  })
  .catch(() => {
    // wait and try again
    setTimeout(() => {
      rehydration()
        .then(() => {
          websocketsManager = new WebsocketManager(marinaStore);
          const state = marinaStore.getState();
          websocketsManager.start(selectNetwork(state)).catch(console.error);
        })
        .catch(console.error);
    }, 1000);
  });

// deep restorer service will be used each time background page receives a RestoreAccountMessage
const deepRestorerService = new DeepRestorerService(marinaStore);

// set up an alarm task to fetch and update new supported taxi assets every 1 minute
setPeriodicTask(
  Alarm.TaxiUpdate,
  () => {
    if (!marinaStore.getState().app.isOnboardingCompleted) return;
    const network = selectNetwork(marinaStore.getState());
    if (network === 'regtest') {
      fetchTaxiAssetsForNetwork(marinaStore, network).catch(console.error);
    }
    fetchTaxiAssetsForNetwork(marinaStore, 'liquid').catch(console.error);
    fetchTaxiAssetsForNetwork(marinaStore, 'testnet').catch(console.error);
  },
  1
);

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
        }
      }
    }
  })().catch(console.error);
});

// /!\ FIX: prevent opening the onboarding page if the browser has been closed
browser.runtime.onStartup.addListener(() => {
  (async () => {
    if (selectEncryptedMnemonic(marinaStore.getState()) === '') {
      // Everytime the browser starts up we need to set up the popup page
      await browser.browserAction.setPopup({ popup: 'popup.html' });
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

    if (isResetMessage(message)) {
      const actionsTypes = [RESET_APP, RESET_WALLET, RESET_CONNECT, RESET_TAXI];
      actionsTypes.forEach((type) => marinaStore.dispatch({ type }));
    }

    if (isSubscribeScriptsMessage(message)) {
      for (const script of message.scripts) {
        websocketsManager
          .subscribeScript(message.network, message.accountID, script)
          .catch(console.error);
      }
    }

    if (isStartWebSocketMessage(message)) {
      websocketsManager.start(message.network).catch(console.error);
    }

    if (isRestoreAccountTaskMessage(message)) {
      deepRestorerService
        .restore(message.accountID, message.network)
        .then(() => {
          port.postMessage(
            restoreAccountTaskResponseMessage(message.accountID, message.network, true)
          );
        })
        .catch((error) =>
          port.postMessage(
            restoreAccountTaskResponseMessage(message.accountID, message.network, false, error)
          )
        );
    }

    if (isForceUpdateMessage(message)) {
      websocketsManager
        .forceUpdateAccount(message.accountID, message.network)
        .then(() =>
          port.postMessage(forceUpdateResponseMessage(message.accountID, message.network, true))
        )
        .catch((error) =>
          port.postMessage(
            forceUpdateResponseMessage(
              message.accountID,
              message.network,
              false,
              extractErrorMessage(error)
            )
          )
        );
    }

    if (isForceUpdateResponseMessage(message)) {
      console.warn('background page should not receive ForceUpdateResponseMessage');
    }

    if (isRestoreAccountTaskResponseMessage(message)) {
      console.warn('background page should not receive RestoreAccountTaskResponseMessage');
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
