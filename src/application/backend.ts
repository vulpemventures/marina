import axios from 'axios';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import { browser, Runtime, Windows } from 'webextension-polyfill-ts';
import {
  address as addressLDK,
  networks,
  AddressInterface,
  decodePset,
  fetchAndUnblindUtxos,
  greedyCoinSelector,
  IdentityInterface,
  isBlindedUtxo,
  psetToUnsignedTx,
  UtxoInterface,
  walletFromCoins,
  BlindingKeyGetter,
  address,
  fetchAndUnblindTxsGenerator,
} from 'ldk';
import Marina from './marina';
import {
  decrypt,
  explorerApiUrl,
  fetchAssetsFromTaxi,
  mnemonicWalletFromAddresses,
  taxiURL,
  toStringOutpoint,
} from './utils';
import { IAssets, AssetsByNetwork } from '../domain/assets';
import { signMessageWithMnemonic } from './utils/message';
import {
  disableWebsite,
  flushMsg,
  flushTx,
  selectHostname,
  setMsg,
  setTx,
  setTxData,
} from './redux/actions/connect';
import {
  ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS,
  TXS_HISTORY_SET_TXS_SUCCESS,
  WALLET_SET_UTXOS_FAILURE,
  WALLET_SET_UTXOS_SUCCESS,
} from './redux/actions/action-types';
import { setAddress } from './redux/actions/wallet';
import { Network } from '../domain/network';
import { createAddress } from '../domain/address';
import { createPassword } from '../domain/password';
import { marinaStore } from './redux/store';
import { TxsHistory } from '../domain/transaction';
import { setTaxiAssets } from './redux/actions/taxi';
import { masterPubKeySelector } from './redux/selectors/wallet.selector';

const POPUP_HTML = 'popup.html';

export default class Backend {
  private emitter: SafeEventEmitter;

  constructor() {
    this.emitter = new SafeEventEmitter();
  }

  waitForEvent<T>(event: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const handleEvent = (val: T) => {
        if (val instanceof Error) {
          return reject(val);
        }
        return resolve(val);
      };
      this.emitter.once(event, handleEvent);
    });
  }

  async isCurentSiteEnabled() {
    const hostname = await getCurrentUrl();
    const state = marinaStore.getState();
    const enabledSites = state.connect.enabledSites[state.app.network];
    return enabledSites.includes(hostname);
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
                return handleResponse(id, getCurrentNetwork());
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.isEnabled.name:
              try {
                const isEnabled = await this.isCurentSiteEnabled();
                return handleResponse(id, isEnabled);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.enable.name:
              try {
                const url = await getCurrentUrl();
                marinaStore.dispatch(selectHostname(url, marinaStore.getState().app.network));
                await showPopup(`connect/enable`);
                await this.waitForEvent(Marina.prototype.enable.name);
                return handleResponse(id);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.disable.name:
              try {
                const hostname = await getCurrentUrl();
                const network = marinaStore.getState().app.network;
                marinaStore.dispatch(disableWebsite(hostname, network));
                return handleResponse(id);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.getAddresses.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }
                const xpub = await getXpub();
                const addrs = await xpub.getAddresses();
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
                const nextAddress = await xpub.getNextAddress();
                persistAddress(nextAddress);
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
                const nextChangeAddress = await xpub.getNextChangeAddress();
                persistAddress(nextChangeAddress);
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
                marinaStore.dispatch(setTx(hostname, tx));
                await showPopup(`connect/spend-pset`);

                const rawTx = await this.waitForEvent(Marina.prototype.signTransaction.name);

                return handleResponse(id, rawTx);
              } catch (e: any) {
                return handleError(id, e);
              }

            case 'SIGN_TRANSACTION_RESPONSE':
              try {
                const [accepted, password] = params;

                // exit early if user rejected the transaction
                if (!accepted) {
                  // Flush tx data
                  marinaStore.dispatch(flushTx());
                  // respond to the injected script
                  this.emitter.emit(
                    Marina.prototype.signTransaction.name,
                    new Error('User rejected the spend request')
                  );
                  // repond to the popup so it can be closed
                  return handleResponse(id);
                }

                const { tx } = marinaStore.getState().connect;
                if (!tx || !tx.pset) throw new Error('Transaction data are missing');

                const mnemo = await getMnemonic(password);
                const signedTx = await mnemo.signPset(tx.pset);

                // respond to the injected script
                this.emitter.emit(Marina.prototype.signTransaction.name, signedTx);

                return handleResponse(id);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.sendTransaction.name:
              try {
                const network = getCurrentNetwork();
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }
                if (!params || params.length !== 3 || params.some((p) => p === null)) {
                  return handleError(id, new Error('Missing params'));
                }
                const [recipientAddress, amountInSatoshis, assetHash]: string[] = params;
                const hostname = await getCurrentUrl();
                marinaStore.dispatch(
                  setTxData(hostname, recipientAddress, amountInSatoshis, assetHash, network)
                );
                await showPopup(`connect/spend`);

                const txid = await this.waitForEvent(Marina.prototype.sendTransaction.name);

                return handleResponse(id, txid);
              } catch (e: any) {
                marinaStore.dispatch(flushTx());
                return handleError(id, e);
              }

            //
            case 'SEND_TRANSACTION_RESPONSE':
              try {
                const [accepted, password] = params;
                const network = getCurrentNetwork();

                // exit early if user rejected the transaction
                if (!accepted) {
                  // Flush tx data
                  marinaStore.dispatch(flushTx());
                  // respond to the injected script
                  this.emitter.emit(
                    Marina.prototype.sendTransaction.name,
                    new Error('User rejected the spend request')
                  );
                  // repond to the popup so it can be closed
                  return handleResponse(id);
                }

                const { tx } = marinaStore.getState().connect;
                if (!tx || !tx.amount || !tx.assetHash || !tx.recipient)
                  throw new Error('Transaction data are missing');

                const { assetHash, amount, recipient } = tx;
                const coins = getCoins();
                const txBuilder = walletFromCoins(coins, network);
                const mnemo = await getMnemonic(password);
                const changeAddress = await mnemo.getNextChangeAddress();

                const unsignedPset = txBuilder.buildTx(
                  txBuilder.createTx(),
                  [
                    {
                      address: recipient,
                      value: Number(amount),
                      asset: assetHash,
                    },
                  ],
                  greedyCoinSelector(),
                  (): string => changeAddress.confidentialAddress,
                  true
                );

                const outputsIndexToBlind: number[] = [];
                const blindKeyMap = new Map<number, string>();
                const recipientData = address.fromConfidential(recipient);
                const recipientScript = address.toOutputScript(recipientData.unconfidentialAddress);
                psetToUnsignedTx(unsignedPset).outs.forEach((out, index) => {
                  if (out.script.length === 0) return;
                  outputsIndexToBlind.push(index);
                  if (out.script.equals(recipientScript))
                    blindKeyMap.set(index, recipientData.blindingKey.toString('hex'));
                });

                const blindedPset = await mnemo.blindPset(
                  unsignedPset,
                  outputsIndexToBlind,
                  blindKeyMap
                );
                const signedPset = await mnemo.signPset(blindedPset);

                const ptx = decodePset(signedPset);
                if (!ptx.validateSignaturesOfAllInputs()) {
                  throw new Error('Transaction contains invalid signatures');
                }

                const txHex = ptx.finalizeAllInputs().extractTransaction().toHex();

                // if we reached this point we can persist the change address
                persistAddress(changeAddress);

                // Flush tx data
                marinaStore.dispatch(flushTx());

                // respond to the injected script
                this.emitter.emit(Marina.prototype.sendTransaction.name, txHex);

                // repond to the popup so it can be closed
                return handleResponse(id);
              } catch (e: any) {
                return handleError(id, e);
              }

            case Marina.prototype.signMessage.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }
                if (!params || params.length !== 1 || params.some((p) => p === null)) {
                  return handleError(id, new Error('Missing params'));
                }
                const hostname = await getCurrentUrl();
                const [message] = params;
                marinaStore.dispatch(setMsg(hostname, message));
                await showPopup(`connect/sign-msg`);

                const rawTx = await this.waitForEvent(Marina.prototype.signMessage.name);

                return handleResponse(id, rawTx);
              } catch (e: any) {
                return handleError(id, e);
              }

            case 'SIGN_MESSAGE_RESPONSE':
              try {
                const [accepted, password] = params;

                // exit early if user rejected the signature
                if (!accepted) {
                  // Flush msg data
                  marinaStore.dispatch(flushMsg());
                  // respond to the injected script
                  this.emitter.emit(
                    Marina.prototype.signMessage.name,
                    new Error('User rejected the signature request')
                  );
                  // repond to the popup so it can be closed
                  return handleResponse(id);
                }

                const { msg } = marinaStore.getState().connect;
                if (!msg || !msg.message) throw new Error('Message data are missing');

                // SIGN THE MESSAGE WITH FIRST ADDRESS FROM HD WALLET
                const signedMsg = await signMsgWithPassword(msg.message, password);

                // respond to the injected script
                this.emitter.emit(Marina.prototype.signMessage.name, signedMsg);

                return handleResponse(id);
              } catch (e: any) {
                return handleError(id, e);
              }

            //
            default:
              return handleError(id, new Error('Method not implemented.'));
          }
        }
      );

      //
      const handleResponse = (id: string, data?: any) => {
        port.postMessage({ id, payload: { success: true, data } });
      };

      //
      const handleError = (id: string, e: Error) => {
        console.error(e);
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
  const xPubKey = masterPubKeySelector(marinaStore.getState());
  await xPubKey.isRestored;
  return xPubKey;
}

function persistAddress(addr: AddressInterface) {
  marinaStore.dispatch(setAddress(createAddress(addr.confidentialAddress)));
}

async function getMnemonic(password: string): Promise<IdentityInterface> {
  let mnemonic = '';
  const { app, wallet } = marinaStore.getState();
  try {
    mnemonic = decrypt(wallet.encryptedMnemonic, createPassword(password));
  } catch (e: any) {
    throw new Error('Invalid password');
  }
  return await mnemonicWalletFromAddresses(
    mnemonic,
    wallet.masterBlindingKey,
    wallet.confidentialAddresses,
    app.network
  );
}

async function signMsgWithPassword(
  message: string,
  password: string
): Promise<{ signature: string; address: string }> {
  let mnemonic = '';
  try {
    const wallet = marinaStore.getState().wallet;
    mnemonic = decrypt(wallet.encryptedMnemonic, createPassword(password));
  } catch (e: any) {
    throw new Error('Invalid password');
  }
  const liquidJSNet = networks[getCurrentNetwork()];
  return await signMessageWithMnemonic(message, mnemonic, liquidJSNet);
}

function getCurrentNetwork(): Network {
  return marinaStore.getState().app.network;
}

function getCoins(): UtxoInterface[] {
  const wallet = marinaStore.getState().wallet;
  return Object.values(wallet.utxoMap);
}

export async function updateUtxos() {
  try {
    const xpub = await getXpub();
    const addrs = await xpub.getAddresses();
    if (addrs.length === 0) return;
    const wallet = marinaStore.getState().wallet;
    const network = getCurrentNetwork();
    const newMap = { ...wallet.utxoMap };
    // Fetch utxo(s). Return blinded utxo(s) if unblinding has been skipped
    const fetchedUtxos = await fetchAndUnblindUtxos(
      addrs,
      explorerApiUrl[network],
      // Skip fetch and unblind if utxo exists in storage
      (utxo) => {
        const outpoint = toStringOutpoint(utxo);
        return wallet.utxoMap[outpoint] !== undefined;
      }
    );
    if (
      fetchedUtxos.every((u) => isBlindedUtxo(u)) &&
      fetchedUtxos.length === Object.keys(wallet.utxoMap).length
    )
      return;
    // Add to newMap fetched utxo(s) not present in storage
    fetchedUtxos.forEach((fetchedUtxo) => {
      const isPresent = Object.keys(wallet.utxoMap).some(
        (storedUtxoOutpoint) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
      );
      if (!isPresent) newMap[toStringOutpoint(fetchedUtxo)] = fetchedUtxo;
    });
    // Delete from newMap utxo(s) not present in fetched utxos
    Object.keys(newMap).forEach((storedUtxoOutpoint) => {
      const isPresent = fetchedUtxos.some(
        (fetchedUtxo) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
      );
      if (!isPresent) delete newMap[storedUtxoOutpoint];
    });

    marinaStore.dispatch({ type: WALLET_SET_UTXOS_SUCCESS, payload: { utxoMap: newMap } });
  } catch (error) {
    marinaStore.dispatch({ type: WALLET_SET_UTXOS_FAILURE, payload: { error } });
  }
}

export async function updateAllAssetInfos() {
  const { app, assets, wallet } = marinaStore.getState();
  const assetsFromUtxos: IAssets = await Promise.all(
    [...Object.values(wallet.utxoMap)].map(async ({ asset }) =>
      // If asset in store don't fetch
      !((asset as string) in assets[app.network])
        ? (
            await axios.get(`${explorerApiUrl[app.network]}/asset/${asset}`)
          ).data
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
        {} as IAssets
      )
  );
  // Update stores
  if (Object.keys(assetsFromUtxos).length) {
    let assetInfosLiquid = assets.liquid;
    let assetInfosRegtest = assets.regtest;
    if (app.network === 'liquid') {
      assetInfosLiquid = { ...assets.liquid, ...assetsFromUtxos };
    } else {
      assetInfosRegtest = { ...assets.regtest, ...assetsFromUtxos };
    }
    const newAssets: AssetsByNetwork = { liquid: assetInfosLiquid, regtest: assetInfosRegtest };

    marinaStore.dispatch({
      type: ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS,
      payload: { assets: newAssets },
    });
  }
}

export async function updateTxsHistory() {
  try {
    const { app, txsHistory, wallet } = marinaStore.getState();
    // Initialize txs to txsHistory shallow clone
    const txs: TxsHistory = { ...txsHistory[app.network] } ?? {};

    const { confidentialAddresses } = wallet;
    const addresses = confidentialAddresses.map((addr) => addr.value);
    const pubKeyWallet = await getXpub();

    const addressInterfaces = await pubKeyWallet.getAddresses();
    const identityBlindKeyGetter: BlindingKeyGetter = (script: string) => {
      try {
        const address = addressLDK.fromOutputScript(
          Buffer.from(script, 'hex'),
          networks[app.network]
        );
        return addressInterfaces.find(
          (addr) =>
            addressLDK.fromConfidential(addr.confidentialAddress).unconfidentialAddress === address
        )?.blindingPrivateKey;
      } catch (_) {
        return undefined;
      }
    };

    const txsGen = fetchAndUnblindTxsGenerator(
      addresses,
      identityBlindKeyGetter,
      explorerApiUrl[app.network],
      // Check if tx exists in React state
      (tx) => txsHistory[app.network][tx.txid] !== undefined
    );

    let it = await txsGen.next();

    // If no new tx already in state then return txsHistory of current network
    if (it.done) {
      return;
    }

    while (!it.done) {
      const tx = it.value;
      // Update all txsHistory state at each single new tx
      txs[tx.txid] = tx;
      marinaStore.dispatch({
        type: TXS_HISTORY_SET_TXS_SUCCESS,
        payload: { txs, network: app.network },
      });
      it = await txsGen.next();
    }
  } catch (error) {
    console.error(error);
  }
}

export async function fetchAndSetTaxiAssets() {
  const state = marinaStore.getState();
  const assets = await fetchAssetsFromTaxi(taxiURL[state.app.network]);

  const currentAssets = state.taxi.taxiAssets;
  const sortAndJoin = (a: string[]) => a.sort().join('');

  if (sortAndJoin(currentAssets) === sortAndJoin(assets)) {
    return; // skip if same assets state
  }

  marinaStore.dispatch(setTaxiAssets(assets));
}
