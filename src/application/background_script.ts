import { browser, Idle, Runtime } from 'webextension-polyfill-ts';
import { App } from '../domain/app/app';
import { IDLE_MESSAGE_TYPE } from './utils';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/routes/constants';
import { repos } from '../infrastructure';
import { initPersistentStore } from '../infrastructure/init-persistent-store';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';

import Marina from './marina';
import { mnemonicWalletFromAddresses, nextAddressForWallet, xpubWalletFromAddresses } from './utils/restorer';
import { Address, Password } from '../domain/wallet/value-objects';
import { AddressInterface, greedyCoinSelector, IdentityInterface, UtxoInterface, Wallet, walletFromCoins } from 'ldk';
import { decrypt } from './utils/crypto';


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

async function getCurrentUrl(): Promise<string> {
  const [currentTab] = await browser.tabs.query({ currentWindow: true, active: true });
  if (!currentTab.url) throw new Error('No active tab available');

  const url = new URL(currentTab.url);

  return url.hostname;
}

async function getXpub(): Promise<IdentityInterface> {
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

  return xpub;
}

async function persistAddress(addr: AddressInterface): Promise<void> {
  const walletRepo = new BrowserStorageWalletRepo();
  await walletRepo.addDerivedAddress(Address.create(addr.confidentialAddress));
}

async function getMnemonic(): Promise<IdentityInterface> {
  const appRepo = new BrowserStorageAppRepo();
  const walletRepo = new BrowserStorageWalletRepo();

  const app = await appRepo.getApp();
  const wallet = await walletRepo.getOrCreateWallet();

  // TODO: show shell popup instead of prompt
  const password = window.prompt("Unlock your wallet");
  if (!password)
    throw new Error('You must enter the password to unlock');

  const mnemonic = decrypt(wallet.encryptedMnemonic, Password.create(password)).value;

  const mnemo = await mnemonicWalletFromAddresses(
    mnemonic,
    wallet.masterBlindingKey.value,
    wallet.confidentialAddresses,
    app.network.value
  );

  return mnemo;
}

async function getCurrentNetwork(): Promise<string> {
  const appRepo = new BrowserStorageAppRepo();
  const app = await appRepo.getApp();

  return app.network.value;
}

async function getCoins(): Promise<UtxoInterface[]> {
  const walletRepo = new BrowserStorageWalletRepo();
  const wallet = await walletRepo.getOrCreateWallet();

  return Object.values(wallet.utxoMap);
}

// TODO all this logic should eventually be moved somewhere else
class Backend {
  // this eventually will go in the repository localStorage
  enabledSites: string[];

  constructor() {
    // we keep a local in-memory list of enabled sites in this session
    this.enabledSites = [];
  }

  enableSite(hostname: string) {
    if (!this.enabledSites.includes(hostname)) {
      this.enabledSites.push(hostname);
    }
  }

  disableSite(hostname: string) {
    if (this.enabledSites.includes(hostname)) {
      this.enabledSites.splice(this.enabledSites.indexOf(hostname), 1);
    }
  }

  async isCurentSiteEnabled() {
    const hostname = await getCurrentUrl();
    return this.enabledSites.includes(hostname);
  }

  start() {
    browser.runtime.onConnect.addListener((port: Runtime.Port) => {

      // We listen for API calls from injected Marina provider.
      // id is random identifier used as reference in the response
      // name is the name of the API method
      // params is the list of arguments from the method

      port.onMessage.addListener(
        async ({ id, name, params }: { id: string; name: string; params: any[] }) => {
          switch (name) {

            case Marina.prototype.getNetwork.name:
              try {
                const network = await getCurrentNetwork()

                return handleResponse(id, network);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.enable.name:
              try {
                const hostname = await getCurrentUrl();

                // Eventually show the shell popup to ask for confirmation from the user
                const confirmed = window.confirm(
                  `Are you sure you want to authorize ${hostname} to access your balances?`
                );

                if (!confirmed) return handleError(id, new Error('User denied access'));

                this.enableSite(hostname);

                return handleResponse(id, undefined);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.disable.name:
              try {
                const hostname = await getCurrentUrl();

                this.disableSite(hostname);

                return handleResponse(id, undefined);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.getAddresses.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }

                const xpub = await getXpub();
                const addrs = xpub.getAddresses();

                return handleResponse(id, addrs);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.getNextAddress.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }

                const xpub = await getXpub();
                const nextAddress = xpub.getNextAddress();

                await persistAddress(nextAddress);

                return handleResponse(id, nextAddress);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.getNextChangeAddress.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }

                const xpub = await getXpub();
                const nextChangeAddress = xpub.getNextChangeAddress();

                await persistAddress(nextChangeAddress);

                return handleResponse(id, nextChangeAddress);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.signTransaction.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }

                if (!params || params.length != 1) {
                  return handleError(id, new Error('Missing params'));
                }

                const [tx] = params;

                const mnemo = await getMnemonic();
                const signedTx = await mnemo.signPset(tx);

                return handleResponse(id, signedTx);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.sendTransaction.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }

                if (!params || params.length != 3) {
                  return handleError(id, new Error('Missing params'));
                }

                const [recipient, amount, asset] = params;

                const coins = await getCoins();
                const network = await getCurrentNetwork();

                const txBuilder = walletFromCoins(coins, network);


                const mnemo = await getMnemonic();
                const changeAddress = mnemo.getNextChangeAddress().confidentialAddress;

                const unsignedTx = txBuilder.buildTx(
                  txBuilder.createTx(),
                  [{
                    address: recipient,
                    value: amount,
                    asset: asset
                  }],
                  greedyCoinSelector(),
                  (asset: string): string => changeAddress,
                  true
                );

                const signedTx = await mnemo.signPset(unsignedTx);

                return handleResponse(id, signedTx);
              } catch (e: any) {
                return handleError(id, e);
              }

            default:
              return handleError(id, new Error('Method not implemented.'));
          }
        }
      );

      const handleResponse = (id: string, data: any) => {
        port.postMessage({ id, payload: { success: true, data } });
      };

      const handleError = (id: string, e: Error) => {
        port.postMessage({ id, payload: { success: false, error: e.message } });
      };
    });
  }
}

// We start listening and handling messages from injected script
const backend = new Backend();
backend.start();
