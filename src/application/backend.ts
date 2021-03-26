import axios from 'axios';
import { browser, Runtime, Windows } from 'webextension-polyfill-ts';
import {
  AddressInterface,
  decodePset,
  fetchAndUnblindUtxos,
  greedyCoinSelector,
  IdentityInterface,
  isBlindedUtxo,
  psetToUnsignedTx,
  UtxoInterface,
  walletFromCoins,
} from 'ldk';
import Marina from './marina';
import {
  broadcastTx,
  decrypt,
  explorerApiUrl,
  mnemonicWalletFromAddresses,
  toStringOutpoint,
  xpubWalletFromAddresses,
} from './utils';
import { Address, Password } from '../domain/wallet/value-objects';
import { Network } from '../domain/app/value-objects';
import { Assets, AssetsByNetwork } from '../domain/asset';
import { repos } from '../infrastructure';
import { toSatoshi } from '../presentation/utils';

const POPUP_HTML = 'popup.html';

export default class Backend {
  private enabledSites: string[];

  constructor() {
    // we keep a local in-memory list of enabled sites in this session
    this.enabledSites = [];
  }

  async enableSite() {
    const network = await getCurrentNetwork();
    await repos.connect.updateConnectData((data) => {
      if (
        !this.enabledSites.includes(data[network].enableSitePending) &&
        !data[network].enabledSites.includes(data[network].enableSitePending)
      ) {
        this.enabledSites.push(data[network].enableSitePending);
        data[network].enabledSites.push(data[network].enableSitePending);
        data[network].enableSitePending = '';
      }
      return data;
    });
  }

  async disableSite(hostname: string) {
    const network = await getCurrentNetwork();
    await repos.connect.updateConnectData((data) => {
      if (this.enabledSites.includes(hostname) && data[network].enabledSites.includes(hostname)) {
        this.enabledSites.splice(this.enabledSites.indexOf(hostname), 1);
        data[network].enabledSites.splice(this.enabledSites.indexOf(hostname), 1);
      }
      return data;
    });
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
          if (id !== 'connect-popup') {
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
                  const network = await getCurrentNetwork();
                  await repos.connect.updateConnectData((data) => {
                    data[network].enableSitePending = hostname;
                    return data;
                  });
                  await showPopup(`connect/enable`);
                  return;
                } catch (e: any) {
                  return handleError(id, e);
                }

              case Marina.prototype.enableResponse.name:
                try {
                  if (params[0]) {
                    await this.enableSite();
                    return handleResponse(id);
                  } else {
                    const network = await getCurrentNetwork();
                    await repos.connect.updateConnectData((data) => {
                      data[network].enableSitePending = '';
                      return data;
                    });
                    return handleError(id, new Error('User denied access'));
                  }
                } catch (e: any) {
                  return handleError(id, e);
                }

              case Marina.prototype.disable.name:
                try {
                  const hostname = await getCurrentUrl();
                  await this.disableSite(hostname);
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
                  if (!params || params.length !== 1 || params.some((p) => p === null)) {
                    return handleError(id, new Error('Missing params'));
                  }
                  const hostname = await getCurrentUrl();
                  const [tx] = params;
                  const network = await getCurrentNetwork();
                  await repos.connect.updateConnectData((data) => {
                    data[network].tx = {
                      hostname: hostname,
                      pset: tx,
                    };
                    return data;
                  });
                  await showPopup(`connect/spend-pset`);
                  return;
                } catch (e: any) {
                  return handleError(id, e);
                }

              case Marina.prototype.signTransactionResponse.name:
                try {
                  const [accepted, password] = params;
                  if (accepted) {
                    const mnemo = await getMnemonic(password);
                    const network = await getCurrentNetwork();
                    const connectDataByNetwork = await repos.connect.getConnectData();
                    if (!connectDataByNetwork[network].tx?.pset) throw new Error('PSET missing');
                    const tx = connectDataByNetwork[network].tx!.pset as string;
                    const signedTx = await mnemo.signPset(tx);
                    return handleResponse(id, signedTx);
                  } else {
                    return handleError(id, new Error('Transaction has been rejected'));
                  }
                } catch (e: any) {
                  return handleError(id, e);
                }

              case Marina.prototype.sendTransaction.name:
                try {
                  if (!(await this.isCurentSiteEnabled())) {
                    return handleError(id, new Error('User must authorize the current website'));
                  }
                  if (!params || params.length !== 3 || params.some((p) => p === null)) {
                    return handleError(id, new Error('Missing params'));
                  }
                  const [recipientAddress, amountInSatoshis, assetHash]: string[] = params;
                  const hostname = await getCurrentUrl();
                  const network = await getCurrentNetwork();
                  await repos.connect.updateConnectData((data) => {
                    data[network].tx = {
                      hostname: hostname,
                      recipient: recipientAddress,
                      amount: amountInSatoshis,
                      assetHash: assetHash,
                    };
                    return data;
                  });
                  await showPopup(`connect/spend`);
                  return;
                } catch (e: any) {
                  const network = await getCurrentNetwork();
                  await repos.connect.updateConnectData((data) => {
                    data[network].tx = undefined;
                    return data;
                  });
                  return handleError(id, e);
                }

              //
              case Marina.prototype.sendTransactionResponse.name:
                try {
                  const [accepted, password] = params;
                  if (accepted) {
                    const network = await getCurrentNetwork();
                    const connectDataByNetwork = await repos.connect.getConnectData();
                    const { tx } = connectDataByNetwork[network];
                    if (!tx || !tx.amount || !tx.assetHash || !tx.recipient)
                      throw new Error('Transaction data are missing');
                    const { assetHash, amount, recipient } = tx;
                    const coins = await getCoins();
                    const txBuilder = walletFromCoins(coins, network);
                    const mnemo = await getMnemonic(password, port);
                    const changeAddress = mnemo.getNextChangeAddress();
                    const unsignedPset = txBuilder.buildTx(
                      txBuilder.createTx(),
                      [
                        {
                          address: recipient,
                          value: toSatoshi(Number(amount)),
                          asset: assetHash,
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
                    // Flush tx data
                    await repos.connect.updateConnectData((data) => {
                      data[network].tx = undefined;
                      return data;
                    });
                    return handleResponse(id, txid);
                  } else {
                    // Flush tx data
                    const network = await getCurrentNetwork();
                    await repos.connect.updateConnectData((data) => {
                      data[network].tx = undefined;
                      return data;
                    });
                    return handleError(id, new Error('Transaction has been rejected'));
                  }
                } catch (e: any) {
                  return handleError(id, e);
                }

              //
              default:
                return handleError(id, new Error('Method not implemented.'));
            }
          }
        }
      );

      //
      const handleResponse = (id: string, data?: any) => {
        port.postMessage({ id, payload: { success: true, data } });
      };

      //
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
  const [app, wallet] = await Promise.all([repos.app.getApp(), repos.wallet.getOrCreateWallet()]);
  return await xpubWalletFromAddresses(
    wallet.masterXPub.value,
    wallet.masterBlindingKey.value,
    wallet.confidentialAddresses,
    app.network.value
  );
}

async function persistAddress(addr: AddressInterface): Promise<void> {
  await repos.wallet.addDerivedAddress(Address.create(addr.confidentialAddress));
}

async function getMnemonic(password: string, port?: Runtime.Port): Promise<IdentityInterface> {
  let mnemonic = '';
  const [app, wallet] = await Promise.all([repos.app.getApp(), repos.wallet.getOrCreateWallet()]);
  try {
    mnemonic = decrypt(wallet.encryptedMnemonic, Password.create(password)).value;
  } catch (e: any) {
    if (port) {
      port.postMessage({ payload: { success: false } });
    }
    throw new Error('Invalid password');
  }
  return await mnemonicWalletFromAddresses(
    mnemonic,
    wallet.masterBlindingKey.value,
    wallet.confidentialAddresses,
    app.network.value
  );
}

async function getCurrentNetwork(): Promise<Network['value']> {
  const app = await repos.app.getApp();
  return app.network.value;
}

async function getCoins(): Promise<UtxoInterface[]> {
  const wallet = await repos.wallet.getOrCreateWallet();
  return Array.from(wallet.utxoMap.values());
}

export async function updateUtxos() {
  const xpub = await getXpub();
  const addrs = xpub.getAddresses();
  const [app, wallet] = await Promise.all([repos.app.getApp(), repos.wallet.getOrCreateWallet()]);
  const newMap = new Map(wallet.utxoMap);
  // Fetch utxo(s). Return blinded utxo(s) if unblinding has been skipped
  const fetchedUtxos = await fetchAndUnblindUtxos(
    addrs,
    explorerApiUrl[app.network.value],
    // Skip fetch and unblind if utxo exists in storage
    (utxo) =>
      Array.from(wallet.utxoMap.keys()).some((outpoint) => `${utxo.txid}:${utxo.vout}` === outpoint)
  );
  if (fetchedUtxos.every((u) => isBlindedUtxo(u)) && fetchedUtxos.length === wallet.utxoMap.size)
    return;
  // Add to newMap fetched utxo(s) not present in storage
  fetchedUtxos.forEach((fetchedUtxo) => {
    const isPresent = Array.from(wallet.utxoMap.keys()).some(
      (storedUtxoOutpoint) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
    );
    if (!isPresent) newMap.set(toStringOutpoint(fetchedUtxo), fetchedUtxo);
  });
  // Delete from newMap utxo(s) not present in fetched utxos
  Array.from(newMap.keys()).forEach((storedUtxoOutpoint) => {
    const isPresent = fetchedUtxos.some(
      (fetchedUtxo) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
    );
    if (!isPresent) newMap.delete(storedUtxoOutpoint);
  });
  await repos.wallet.setUtxos(newMap);
}

export async function updateAllAssetInfos() {
  const [app, assets, wallet] = await Promise.all([
    repos.app.getApp(),
    repos.assets.getAssets(),
    repos.wallet.getOrCreateWallet(),
  ]);
  const assetsFromUtxos: Assets = await Promise.all(
    [...wallet.utxoMap.values()].map(async ({ asset }) =>
      // If asset in store don't fetch
      !((asset as string) in assets[app.network.value])
        ? (await axios.get(`${explorerApiUrl[app.network.value]}/asset/${asset}`)).data
        : undefined
    )
  ).then((assetInfos) =>
    assetInfos
      .filter((a) => a !== undefined)
      .reduce(
        (acc, { asset_id, name, ticker, precision }) => ({
          ...acc,
          [asset_id]: { name, ticker, precision },
        }),
        {} as Assets
      )
  );
  // Update stores
  if (Object.keys(assetsFromUtxos).length) {
    let assetInfosLiquid = assets.liquid;
    let assetInfosRegtest = assets.regtest;
    if (app.network.value === 'liquid') {
      assetInfosLiquid = { ...assets.liquid, ...assetsFromUtxos };
    } else {
      assetInfosRegtest = { ...assets.regtest, ...assetsFromUtxos };
    }
    const newAssets: AssetsByNetwork = { liquid: assetInfosLiquid, regtest: assetInfosRegtest };
    await repos.assets.updateAssets(() => newAssets);
  }
}
