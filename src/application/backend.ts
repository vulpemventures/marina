import { browser, Runtime, Windows } from 'webextension-polyfill-ts';
import Marina from './marina';
import {
  AddressInterface,
  decodePset,
  greedyCoinSelector,
  IdentityInterface,
  psetToUnsignedTx,
  UtxoInterface,
  walletFromCoins,
} from 'ldk';
import {
  broadcastTx,
  decrypt,
  explorerApiUrl,
  mnemonicWalletFromAddresses,
  xpubWalletFromAddresses,
} from './utils';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { Address, Password } from '../domain/wallet/value-objects';
import { Network } from '../domain/app/value-objects';
import { repos } from '../infrastructure';
import { toSatoshi } from '../presentation/utils';

const POPUP_HTML = 'popup.html';

export default class Backend {
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
                const network = await getCurrentNetwork();

                return handleResponse(id, network);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.enable.name:
              try {
                const hostname = await getCurrentUrl();
                // popup response
                if (id === 'connect-popup') {
                  if (params[0]) {
                    this.enableSite(params[1]);
                    return handleResponse(id);
                  } else {
                    return handleError(id, new Error('User denied access'));
                  }
                } else {
                  // call from api
                  await showPopup(`enable?origin=${hostname}`);
                }
                return;
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
                // from spend popup
                if (id === 'connect-popup') {
                  if (params[0]) {
                    const mnemo = await getMnemonic();
                    const signedTx = await mnemo.signPset(params[1]);
                    return handleResponse(id, signedTx);
                  } else {
                    return handleError(id, new Error('Transaction has been rejected'));
                  }
                } else {
                  // from api call
                  if (!(await this.isCurentSiteEnabled())) {
                    return handleError(id, new Error('User must authorize the current website'));
                  }
                  if (!params || params.length !== 1 || params.some((p) => p === null)) {
                    return handleError(id, new Error('Missing params'));
                  }
                  const hostname = await getCurrentUrl();
                  const [tx] = params;
                  await showPopup(`spend?origin=${hostname}&method=signTransaction&tx=${tx}`);
                }
                return;
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.sendTransaction.name:
              try {
                // from spend popup
                if (id === 'connect-popup') {
                  if (params[0]) {
                    const coins = await getCoins();
                    const network = await getCurrentNetwork();
                    const txBuilder = walletFromCoins(coins, network);
                    const mnemo = await getMnemonic();
                    const changeAddress = mnemo.getNextChangeAddress();
                    const unsignedPset = txBuilder.buildTx(
                      txBuilder.createTx(),
                      [
                        {
                          address: params[1],
                          value: toSatoshi(Number(params[2])),
                          asset: params[3],
                        },
                      ],
                      greedyCoinSelector(),
                      (): string => changeAddress.confidentialAddress,
                      true
                    );
                    const unsignedTx = psetToUnsignedTx(unsignedPset);
                    const outputsIndexToBlind: number[] = [];
                    unsignedTx.outs.forEach((out, i) => {
                      if (out.script.length > 0) {
                        outputsIndexToBlind.push(i);
                      }
                    });
                    const blindedPset = await mnemo.blindPset(unsignedPset, outputsIndexToBlind);
                    const signedPset = await mnemo.signPset(blindedPset);
                    const ptx = decodePset(signedPset);
                    if (!ptx.validateSignaturesOfAllInputs()) {
                      throw new Error('Transaction contains invalid signatures');
                    }
                    const txHex = ptx.finalizeAllInputs().extractTransaction().toHex();
                    const txid = await broadcastTx(explorerApiUrl[network], txHex);
                    // if we reached this point we can persist the change address
                    await persistAddress(changeAddress);
                    return handleResponse(id, txid);
                  } else {
                    return handleError(id, new Error('Transaction has been rejected'));
                  }
                } else {
                  // api call
                  if (!(await this.isCurentSiteEnabled())) {
                    return handleError(id, new Error('User must authorize the current website'));
                  }
                  if (!params || params.length !== 3 || params.some((p) => p === null)) {
                    return handleError(id, new Error('Missing params'));
                  }
                  const hostname = await getCurrentUrl();
                  const [recipientAddress, amountInSatoshis, assetHash] = params;
                  await showPopup(
                    `spend?origin=${hostname}&method=sendTransaction&recipient=${recipientAddress}&amount=${amountInSatoshis}&assetHash=${assetHash}`
                  );
                }
                return;
              } catch (e: any) {
                return handleError(id, e);
              }

            default:
              return handleError(id, new Error('Method not implemented.'));
          }
        }
      );

      const handleResponse = (id: string, data?: any) => {
        port.postMessage({ id, payload: { success: true, data } });
      };

      const handleError = (id: string, e: Error) => {
        console.error(e.stack);
        port.postMessage({
          id,
          payload: { success: false, error: e.message },
        });
      };
    });
  }
}

async function getCurrentUrl(): Promise<string> {
  const [currentTab] = await browser.tabs.query({ currentWindow: true, active: true });
  if (!currentTab.url) throw new Error('No active tab available');
  const url = new URL(currentTab.url);
  return url.hostname;
}

export function showPopup(path?: string): Promise<Windows.Window> {
  const options = {
    url: `${POPUP_HTML}#/${path}`,
    type: 'popup',
    height: 600,
    width: 360,
    focused: true,
    left: 100,
    top: 100,
  };

  return browser.windows.create(options as any);
}

async function getXpub(): Promise<IdentityInterface> {
  const appRepo = new BrowserStorageAppRepo();
  const walletRepo = new BrowserStorageWalletRepo();

  const [app, wallet] = await Promise.all([appRepo.getApp(), walletRepo.getOrCreateWallet()]);

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

  const [app, wallet] = await Promise.all([appRepo.getApp(), walletRepo.getOrCreateWallet()]);

  // TODO: show shell popup instead of prompt
  const password = window.prompt('Unlock your wallet');
  if (!password) throw new Error('You must enter the password to unlock');

  let mnemonic: string;
  try {
    mnemonic = decrypt(wallet.encryptedMnemonic, Password.create(password)).value;
  } catch (e: any) {
    throw new Error('Invalid password');
  }

  const mnemo = await mnemonicWalletFromAddresses(
    mnemonic,
    wallet.masterBlindingKey.value,
    wallet.confidentialAddresses,
    app.network.value
  );

  return mnemo;
}

async function getCurrentNetwork(): Promise<Network['value']> {
  const appRepo = new BrowserStorageAppRepo();
  const app = await appRepo.getApp();

  return app.network.value;
}

async function getCoins(): Promise<UtxoInterface[]> {
  const wallet = await repos.wallet.getOrCreateWallet();
  return Array.from(wallet.utxoMap.values());
}
