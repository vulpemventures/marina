import { RootReducerState } from './../domain/common';
import { defaultPrecision } from './utils/constants';
import axios from 'axios';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import { browser, Runtime, Windows } from 'webextension-polyfill-ts';
import {
  address as addressLDK,
  networks,
  decodePset,
  greedyCoinSelector,
  IdentityInterface,
  isBlindedUtxo,
  psetToUnsignedTx,
  UtxoInterface,
  walletFromCoins,
  BlindingKeyGetter,
  address,
  fetchAndUnblindTxsGenerator,
  fetchAndUnblindUtxosGenerator,
  masterPubKeyRestorerFromState,
  masterPubKeyRestorerFromEsplora,
} from 'ldk';
import Marina from './marina';
import {
  decrypt,
  fetchAssetsFromTaxi,
  getStateRestorerOptsFromAddresses,
  mnemonicWallet,
  taxiURL,
  toDisplayTransaction,
  toStringOutpoint,
} from './utils';
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
  incrementAddressIndex,
  incrementChangeAddressIndex,
  setDeepRestorerError,
  setDeepRestorerIsLoading,
  setWalletData,
} from './redux/actions/wallet';
import { Network } from '../domain/network';
import { createAddress } from '../domain/address';
import { createPassword } from '../domain/password';
import { marinaStore } from './redux/store';
import { setTaxiAssets, updateTaxiAssets } from './redux/actions/taxi';
import {
  masterPubKeySelector,
  restorerOptsSelector,
  utxosSelector,
} from './redux/selectors/wallet.selector';
import { addUtxo, deleteUtxo, updateUtxos } from './redux/actions/utxos';
import { addAsset } from './redux/actions/asset';
import { ThunkAction } from 'redux-thunk';
import { AnyAction, Dispatch } from 'redux';
import { assetGetterFromIAssets, IAssets } from '../domain/assets';
import { addTx, updateTxs } from './redux/actions/transaction';
import { getExplorerURLSelector } from './redux/selectors/app.selector';
import { walletTransactions } from './redux/selectors/transaction.selector';
import { balancesSelector } from './redux/selectors/balance.selector';
import { Balance } from 'marina-provider';

const POPUP_HTML = 'popup.html';
const UPDATE_ALARM = 'UPDATE_ALARM';

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
                if (!(await this.isCurentSiteEnabled())) {
                  const url = await getCurrentUrl();
                  marinaStore.dispatch(selectHostname(url, marinaStore.getState().app.network));
                  await showPopup(`connect/enable`);
                  await this.waitForEvent(Marina.prototype.enable.name);
                  return handleResponse(id);
                }
                return handleError(id, new Error('current site is already enabled'));
              } catch (e: any) {
                return handleError(id, e);
              }

            case 'ENABLE_RESPONSE':
              try {
                const [accepted] = params;

                // exit early if user rejected the transaction
                if (!accepted) {
                  // respond to the injected script
                  this.emitter.emit(
                    Marina.prototype.enable.name,
                    new Error('User rejected the enable request')
                  );
                  // repond to the popup so it can be closed
                  return handleResponse(id);
                }

                // respond to the injected script
                this.emitter.emit(Marina.prototype.enable.name);

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
                persistAddress(false);
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
                persistAddress(true);
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
                persistAddress(true);

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

            case Marina.prototype.getTransactions.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }
                const transactions = walletTransactions(marinaStore.getState());
                return handleResponse(id, transactions);
              } catch (e) {
                return handleError(id, e);
              }

            case Marina.prototype.getCoins.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }
                const coins = utxosSelector(marinaStore.getState());
                return handleResponse(id, coins);
              } catch (e) {
                return handleError(id, e);
              }

            case Marina.prototype.getBalances.name:
              try {
                if (!(await this.isCurentSiteEnabled())) {
                  return handleError(id, new Error('User must authorize the current website'));
                }
                const balances = balancesSelector(marinaStore.getState());
                const assetGetter = assetGetterFromIAssets(marinaStore.getState().assets);

                const results: Balance[] = [];

                for (const [assetHash, amount] of Object.entries(balances)) {
                  results.push({ asset: assetGetter(assetHash), amount });
                }

                return handleResponse(id, results);
              } catch (e) {
                return handleError(id, e);
              }

            case Marina.prototype.isReady.name:
              try {
                await getXpub(); // check if Xpub is valid
                return handleResponse(id, marinaStore.getState().app.isOnboardingCompleted);
              } catch {
                return handleResponse(id, false);
              }

            //
            default:
              return handleError(id, new Error('Method not implemented.'));
          }
        }
      );

      const handleResponse = (id: string, data?: any) => {
        port.postMessage({ id, payload: { success: true, data } });
      };

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

function getXpub(): Promise<IdentityInterface> {
  const state = marinaStore.getState();
  const xPubKey = masterPubKeySelector(state);
  const opts = restorerOptsSelector(state);
  return masterPubKeyRestorerFromState(xPubKey)(opts);
}

function persistAddress(isChange: boolean) {
  let action: AnyAction;
  if (isChange) {
    action = incrementChangeAddressIndex();
  } else {
    action = incrementAddressIndex();
  }
  marinaStore.dispatch(action);
}

async function getMnemonic(password: string): Promise<IdentityInterface> {
  let mnemonic = '';
  const state = marinaStore.getState();
  const { wallet, app } = state;
  try {
    mnemonic = decrypt(wallet.encryptedMnemonic, createPassword(password));
  } catch (e: any) {
    throw new Error('Invalid password');
  }
  const restorerOpts = restorerOptsSelector(state);
  return await mnemonicWallet(mnemonic, restorerOpts, app.network);
}

async function signMsgWithPassword(
  message: string,
  password: string
): Promise<{ signature: string; address: string }> {
  let mnemonic = '';
  const network = getCurrentNetwork();
  try {
    const { wallet } = marinaStore.getState();
    mnemonic = decrypt(wallet.encryptedMnemonic, createPassword(password));
  } catch (e: any) {
    throw new Error('Invalid password');
  }
  const net = networks[network];
  return await signMessageWithMnemonic(message, mnemonic, net);
}

function getCurrentNetwork(): Network {
  return marinaStore.getState().app.network;
}

function getCoins(): UtxoInterface[] {
  const wallet = marinaStore.getState().wallet;
  return Object.values(wallet.utxoMap);
}

/**
 * fetch and unblind the utxos and then refresh it.
 */
export function fetchAndUpdateUtxos(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return async (dispatch, getState) => {
    try {
      const { wallet, app } = getState();
      if (!app.isAuthenticated) return;

      const xpub = await getXpub();
      const addrs = (await xpub.getAddresses()).reverse();
      if (addrs.length === 0) return;

      const explorer = getExplorerURLSelector(getState());

      const currentOutpoints = Object.values(wallet.utxoMap).map(({ txid, vout }) => ({
        txid,
        vout,
      }));

      const skippedOutpoints: string[] = []; // for deleting

      // Fetch utxo(s). Return blinded utxo(s) if unblinding has been skipped
      const utxos = fetchAndUnblindUtxosGenerator(
        addrs,
        explorer,
        // Skip unblinding if utxo exists in current state
        (utxo) => {
          const outpoint = toStringOutpoint(utxo);
          const skip = wallet.utxoMap[outpoint] !== undefined;

          if (skip) skippedOutpoints.push(toStringOutpoint(utxo))

          return skip
        }
      );


      let utxoIterator = await utxos.next();
      while (!utxoIterator.done) {
        const utxo = utxoIterator?.value;
        if (!isBlindedUtxo(utxo)) {
          if (utxo.asset) {
            const assets = getState().assets;
            await fetchAssetInfos(utxo.asset, explorer, assets, dispatch).catch(console.error);
          }
          dispatch(addUtxo(utxo));
        }
        utxoIterator = await utxos.next();
      }

      if (utxoIterator.done) {
        console.info(`number of utxos fetched: ${utxoIterator.value.numberOfUtxos}`);
        if (utxoIterator.value.errors) {
          console.warn(
            `${utxoIterator.value.errors.length} errors occurs during utxos updater generator`
          );
        }
      }

      for (const outpoint of currentOutpoints) {
        if (skippedOutpoints.includes(toStringOutpoint(outpoint))) continue;
        // if not skipped, it means the utxo has been spent
        dispatch(deleteUtxo(outpoint.txid, outpoint.vout));
      }
    } catch (error) {
      console.error(`fetchAndUpdateUtxos error: ${error.message}`);
    }
  };
}

/**
 * fetch the asset infos from explorer (ticker, precision etc...)
 */
async function fetchAssetInfos(
  assetHash: string,
  explorerUrl: string,
  assetsState: IAssets,
  dispatch: Dispatch
) {
  if (assetsState[assetHash] !== undefined) return; // do not update

  const assetInfos = (await axios.get(`${explorerUrl}/asset/${assetHash}`)).data;
  const name = assetInfos?.name ? assetInfos.name : 'Unknown';
  const ticker = assetInfos?.ticker ? assetInfos.ticker : assetHash.slice(0, 4).toUpperCase();
  const precision = assetInfos.precision !== undefined ? assetInfos.precision : defaultPrecision;

  dispatch(addAsset(assetHash, { name, ticker, precision }));
}

/**
 * use fetchAndUnblindTxsGenerator to update the tx history
 */
export function updateTxsHistory(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return async (dispatch, getState) => {
    try {
      const { app, txsHistory } = getState();
      if (!app.isAuthenticated) return;
      // Initialize txs to txsHistory shallow clone
      const pubKeyWallet = await getXpub();
      const addressInterfaces = (await pubKeyWallet.getAddresses()).reverse();
      const walletScripts = addressInterfaces.map((a) =>
        address.toOutputScript(a.confidentialAddress).toString('hex')
      );

      const explorer = getExplorerURLSelector(getState());

      const identityBlindKeyGetter: BlindingKeyGetter = (script: string) => {
        try {
          const address = addressLDK.fromOutputScript(
            Buffer.from(script, 'hex'),
            networks[app.network]
          );
          return addressInterfaces.find(
            (addr) =>
              addressLDK.fromConfidential(addr.confidentialAddress).unconfidentialAddress ===
              address
          )?.blindingPrivateKey;
        } catch (_) {
          return undefined;
        }
      };

      const txsGen = fetchAndUnblindTxsGenerator(
        addressInterfaces.map((a) => a.confidentialAddress),
        identityBlindKeyGetter,
        explorer,
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
        const toAdd = toDisplayTransaction(tx, walletScripts);
        dispatch(addTx(toAdd, app.network));
        it = await txsGen.next();
      }
    } catch (error) {
      console.error(`fetchAndUnblindTxs: ${error}`);
    }
  };
}

/**
 * fetch assets from taxi daemon endpoint (make a grpc call)
 * and then set assets in store.
 */
export function fetchAndSetTaxiAssets(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return async (dispatch, getState) => {
    const state = getState();
    const assets = await fetchAssetsFromTaxi(taxiURL[state.app.network]);

    const currentAssets = state.taxi.taxiAssets;
    const sortAndJoin = (a: string[]) => a.sort().join('');

    if (sortAndJoin(currentAssets) === sortAndJoin(assets)) {
      return; // skip if same assets state
    }

    dispatch(setTaxiAssets(assets));
  };
}

export function startAlarmUpdater(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return (dispatch) => {
    dispatch(updateUtxos());

    browser.alarms.onAlarm.addListener((alarm) => {
      switch (alarm.name) {
        case UPDATE_ALARM:
          dispatch(updateTxs());
          dispatch(updateUtxos());
          dispatch(updateTaxiAssets());
          break;

        default:
          break;
      }
    });

    browser.alarms.create(UPDATE_ALARM, {
      when: Date.now(),
      periodInMinutes: 4,
    });
  };
}

export function deepRestorer(): ThunkAction<void, RootReducerState, any, AnyAction> {
  return async (dispatch, getState) => {
    const state = getState();
    const { isLoading, gapLimit } = state.wallet.deepRestorer;
    const toRestore = masterPubKeySelector(state);
    const explorer = getExplorerURLSelector(getState());
    if (isLoading) return;

    try {
      dispatch(setDeepRestorerIsLoading(true));
      const opts = { gapLimit, esploraURL: explorer };
      const publicKey = await masterPubKeyRestorerFromEsplora(toRestore)(opts);
      const addresses = (await publicKey.getAddresses()).map((a) =>
        createAddress(a.confidentialAddress, a.derivationPath)
      );

      const restorerOpts = getStateRestorerOptsFromAddresses(addresses);

      dispatch(
        setWalletData({
          ...state.wallet,
          restorerOpts,
          confidentialAddresses: addresses,
        })
      );

      dispatch(updateUtxos());
      dispatch(updateTxsHistory());
      dispatch(fetchAndSetTaxiAssets());

      dispatch(setDeepRestorerError(undefined));
    } catch (err) {
      dispatch(setDeepRestorerError(err.message || err));
    } finally {
      dispatch(setDeepRestorerIsLoading(false));
    }
  };
}
