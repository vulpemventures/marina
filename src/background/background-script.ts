import SafeEventEmitter from '@metamask/safe-event-emitter';
import Browser from 'webextension-polyfill';
import zkp from '@vulpemventures/secp256k1-zkp';
import type { OpenPopupMessage, PopupName, RestoreMessage } from '../domain/message';
import {
  isRestoreMessage,
  isStartServicesMessage,
  isStopSevicesMessage,
  isOpenPopupMessage,
  isPopupResponseMessage,
} from '../domain/message';
import { SubscriberService } from './subscriber';
import { INITIALIZE_WELCOME_ROUTE } from '../extension/routes/constants';
import { AppStorageAPI } from '../infrastructure/storage/app-repository';
import { AssetStorageAPI } from '../infrastructure/storage/asset-repository';
import { TaxiStorageAPI } from '../infrastructure/storage/taxi-repository';
import { WalletStorageAPI } from '../infrastructure/storage/wallet-repository';
import { TaxiUpdater } from './taxi-updater';
import { UpdaterService } from '../application/updater';
import { tabIsOpen } from './utils';
import { AccountFactory } from '../application/account';
import { extractErrorMessage } from '../extension/utility/error';
import { getBackgroundPortImplementation } from '../port/background-port';
import { BlockHeadersAPI } from '../infrastructure/storage/blockheaders-repository';
import type { ChainSource } from '../domain/chainsource';
import { WalletRepositoryUnblinder } from '../application/unblinder';
import { Transaction } from 'liquidjs-lib';
import { BackupSyncer } from './backup-syncer';

// manifest v2 needs BrowserAction, v3 needs action
const action = Browser.browserAction ?? Browser.action;

// top-level await supported via webpack
const zkpLib = await zkp();

const POPUP_RESPONSE = 'popup-response';

// MUST be > 15 seconds
const IDLE_TIMEOUT_IN_SECONDS = 300; // 5 minutes
let welcomeTabID: number | undefined = undefined;

const backgroundPort = getBackgroundPortImplementation();

const walletRepository = new WalletStorageAPI();
const appRepository = new AppStorageAPI();
const assetRepository = new AssetStorageAPI();
const taxiRepository = new TaxiStorageAPI(assetRepository, appRepository);
const blockHeadersRepository = new BlockHeadersAPI();

const updaterService = new UpdaterService(
  walletRepository,
  appRepository,
  blockHeadersRepository,
  assetRepository,
  zkpLib
);
const subscriberService = new SubscriberService(
  walletRepository,
  appRepository,
  blockHeadersRepository
);
const taxiService = new TaxiUpdater(taxiRepository, appRepository, assetRepository);
const backupSyncerService = new BackupSyncer(appRepository, walletRepository);

let started = false;

// at startup, check if the user is logged in
// if so, start the services
appRepository
  .getStatus()
  .then(({ isAuthenticated }) => {
    if (isAuthenticated) {
      startBackgroundServices().catch(console.error);
    }
  })
  .catch(console.error);

async function startBackgroundServices() {
  if (started) return;
  started = true;
  await walletRepository.unlockUtxos(); // unlock all utxos at startup
  const results = await Promise.allSettled([
    updaterService.start(),
    subscriberService.start(),
    Promise.resolve(taxiService.start()),
    backupSyncerService.start(),
  ]);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(result.reason);
    }
  });
}

async function restoreTask(restoreMessage: RestoreMessage): Promise<void> {
  let chainSource: ChainSource | null = null;
  try {
    await appRepository.restorerLoader.increment();
    const factory = await AccountFactory.create(walletRepository);
    const network = await appRepository.getNetwork();
    if (!network) throw new Error('no network selected');
    const account = await factory.make(restoreMessage.data.network, restoreMessage.data.accountID);
    chainSource = await appRepository.getChainSource();
    if (!chainSource) throw new Error('no chain source selected');
    const { txIDsFromChain } = await account.sync(chainSource, restoreMessage.data.gapLimit);
    const transactions = await chainSource.fetchTransactions(txIDsFromChain);
    const unblinder = new WalletRepositoryUnblinder(
      walletRepository,
      appRepository,
      assetRepository,
      zkpLib
    );
    const unblindingResult = await unblinder.unblindTxs(
      ...transactions.map(({ hex }) => Transaction.fromHex(hex))
    );
    await walletRepository.updateOutpointBlindingData(unblindingResult);
  } finally {
    if (chainSource) {
      await chainSource.close();
    }
    await appRepository.restorerLoader.decrement();
  }
}

async function stopBackgroundServices() {
  started = false;
  const results = await Promise.allSettled([
    updaterService.stop(),
    subscriberService.stop(),
    taxiService.stop(),
    backupSyncerService.stop(),
  ]);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(result.reason);
    }
  });
}

/**
 * Fired when the extension is first installed, when the extension is updated to a new version,
 * and when the browser is updated to a new version.
 * https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/
 */
Browser.runtime.onInstalled.addListener(({ reason }) => {
  (async () => {
    switch (reason) {
      //On first install, open new tab for onboarding
      case 'install': {
        // run onboarding flow on fullscreen
        welcomeTabID = await openInitializeWelcomeRoute();
        break;
      }
      case 'update': {
        const { isOnboardingCompleted } = await appRepository.getStatus();
        if (isOnboardingCompleted) {
          // After an update, and only if the user is already onboarded,
          // we need the setup the popup or the first click on the
          // extension icon will do nothing
          await action.setPopup({ popup: 'popup.html' });
        }
      }
    }
  })().catch(console.error);
});

// /!\ FIX: prevent opening the onboarding page if the browser has been closed
Browser.runtime.onStartup.addListener(() => {
  (async () => {
    const encryptedMnemonic = await walletRepository.getEncryptedMnemonic();
    if (encryptedMnemonic) {
      // Everytime the browser starts up we need to set up the popup page
      await action.setPopup({ popup: 'popup.html' });
    }
  })().catch(console.error);
});

// this listener only run IF AND ONLY IF the popup is not set
// popup is set at the end of onboarding workflow
action.onClicked.addListener(() => {
  (async () => {
    // here we prevent to open many onboarding pages fullscreen
    // in case we have one active already in the current tab
    if (welcomeTabID && (await tabIsOpen(welcomeTabID))) return;

    // in case the onboarding page is closed before finishing
    // the wallet creation process, we let user re-open it
    // Check if wallet exists in storage and if not we open the
    // onboarding page again.
    const encryptedMnemonic = await walletRepository.getEncryptedMnemonic();
    if (!encryptedMnemonic) {
      welcomeTabID = await openInitializeWelcomeRoute();
      return;
    } else {
      await action.setPopup({ popup: 'popup.html' });
      // Function Browser.browserAction.openPopup() exists in Firefox but not in Chrome
      if (action.openPopup !== undefined) await action.openPopup();
    }
  })().catch(console.error);
});

// the event emitter is used to link all the content-scripts (popups and providers ones)
const eventEmitter = new SafeEventEmitter();

backgroundPort.onMessage(async (message, sendResponse) => {
  if (isOpenPopupMessage(message)) {
    try {
      await handleOpenPopupMessage(message, sendResponse);
    } catch (error) {
      console.error(error);
      sendResponse({ data: undefined, error: extractErrorMessage(error) });
    }
    return;
  }
  if (isPopupResponseMessage(message)) {
    // propagate popup response
    eventEmitter.emit(POPUP_RESPONSE, message);
    sendResponse({ data: undefined, error: undefined });
    return;
  }

  if (isStartServicesMessage(message)) {
    await startBackgroundServices();
    sendResponse({ data: undefined, error: undefined });
    return;
  }

  if (isStopSevicesMessage(message)) {
    await stopBackgroundServices();
    sendResponse({ data: undefined, error: undefined });
    return;
  }

  if (isRestoreMessage(message)) {
    await restoreTask(message);
    sendResponse({ data: undefined, error: undefined });
    return;
  }
});

// Open the popup window and wait for a response
// then forward the response to content-script
async function handleOpenPopupMessage(
  message: OpenPopupMessage,
  sendResponse: (response: any) => void
) {
  await createBrowserPopup(message.data.name);
  eventEmitter.once(POPUP_RESPONSE, (data: any) => {
    sendResponse(data);
  });
}

try {
  // set the idle detection interval
  Browser.idle.setDetectionInterval(IDLE_TIMEOUT_IN_SECONDS);
  // add listener on Idle API, sending a message if the new state isn't 'active'
  Browser.idle.onStateChanged.addListener(function (newState: Browser.Idle.IdleState) {
    console.debug('Idle state changed to ' + newState);
    switch (newState) {
      default:
        stopBackgroundServices().catch(console.error);
        break;
    }
  });
} catch (error) {
  console.error(error);
}

async function openInitializeWelcomeRoute(): Promise<number | undefined> {
  const url = Browser.runtime.getURL(`home.html#${INITIALIZE_WELCOME_ROUTE}`);
  const { id } = await Browser.tabs.create({ url });
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
    const { left, top, width } = await Browser.windows.getLastFocused();
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
  await Browser.windows.create(options as any);
}
