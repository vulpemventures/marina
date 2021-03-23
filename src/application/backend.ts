import axios from 'axios';
import { browser, Runtime } from 'webextension-polyfill-ts';
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
import {
  broadcastTx,
  decrypt,
  explorerApiUrl,
  mnemonicWalletFromAddresses,
  toStringOutpoint,
  xpubWalletFromAddresses,
} from './utils';
import Marina from './marina';
import { Address, Password } from '../domain/wallet/value-objects';
import { Network } from '../domain/app/value-objects';
import { Assets, AssetsByNetwork } from '../domain/asset';
import { repos } from '../infrastructure';

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
          console.log('name!!!!', name);
          switch (name) {
            case 'startAlarmUtxosAssets':
              try {
                const nowPlus5sec = Date.now() + 5000;
                browser.alarms.create('updateUtxosAssets', {
                  when: nowPlus5sec,
                  periodInMinutes: 1,
                });
                browser.alarms.onAlarm.addListener(async (alarm) => {
                  console.log(alarm.name);
                  if (alarm.name === 'updateUtxosAssets') {
                    console.log('alarm updateUtxos !!!!!!');
                    const utxos = await updateUtxos();
                    await updateAllAssetInfos();
                    console.log('id', id);
                    return handleResponse(id, { utxos });
                  }
                });
                return handleResponse(id, { message: 'Polling of utxos and assets started' });
              } catch (e: any) {
                return handleError(id, e);
              }

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
                if (!params || params.length !== 1) {
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
                if (!params || params.length !== 3) {
                  return handleError(id, new Error('Missing params'));
                }
                const [recipient, amount, asset] = params;
                const coins = await getCoins();
                const network = await getCurrentNetwork();
                const txBuilder = walletFromCoins(coins, network);
                const mnemo = await getMnemonic();
                const changeAddress = mnemo.getNextChangeAddress();
                const unsignedPset = txBuilder.buildTx(
                  txBuilder.createTx(),
                  [
                    {
                      address: recipient,
                      value: amount,
                      asset: asset,
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

async function getCurrentUrl(): Promise<string> {
  const [currentTab] = await browser.tabs.query({ currentWindow: true, active: true });
  if (!currentTab.url) throw new Error('No active tab available');
  const url = new URL(currentTab.url);
  return url.hostname;
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

async function getMnemonic(): Promise<IdentityInterface> {
  const [app, wallet] = await Promise.all([repos.app.getApp(), repos.wallet.getOrCreateWallet()]);
  // TODO: show shell popup instead of prompt
  const password = window.prompt('Unlock your wallet');
  if (!password) throw new Error('You must enter the password to unlock');
  let mnemonic: string;
  try {
    mnemonic = decrypt(wallet.encryptedMnemonic, Password.create(password)).value;
  } catch (e: any) {
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

async function updateUtxos() {
  const xpub = await getXpub();
  const addrs = xpub.getAddresses();
  const [app, wallet] = await Promise.all([repos.app.getApp(), repos.wallet.getOrCreateWallet()]);
  const newMap = new Map(wallet.utxoMap);
  // Fetch utxo(s). Return blinded utxo(s) if unblinding has been skipped
  const fetchedUtxos = await fetchAndUnblindUtxos(
    addrs,
    explorerApiUrl[app.network.value],
    // Skip fetch and unblind if utxo exists in React state
    (utxo) =>
      Array.from(wallet.utxoMap.keys()).some((outpoint) => `${utxo.txid}:${utxo.vout}` === outpoint)
  );
  if (fetchedUtxos.every((u) => isBlindedUtxo(u)) && fetchedUtxos.length === wallet.utxoMap.size)
    return wallet.utxoMap;
  // Add to newMap fetched utxo(s) not present in store
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
  console.log('newMap', newMap);
  await repos.wallet.setUtxos(newMap);
  return newMap;
}

async function updateAllAssetInfos() {
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
    console.log('newAssets', newAssets);
    await repos.assets.updateAssets(() => newAssets);
  }
}
