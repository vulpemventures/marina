import { browser, Windows } from 'webextension-polyfill-ts';

import { stringify } from '../application/utils/browser-storage-converters';
import { compareCacheForEvents, newCacheFromState, newStoreCache, StoreCache } from './store-cache';
import Broker, { BrokerOption } from './broker';
import {
  MessageHandler,
  newErrorResponseMessage,
  newSuccessResponseMessage,
  RequestMessage,
} from '../domain/message';
import Marina from '../inject-scripts/marina';
import { RootReducerState } from '../domain/common';
import {
  disableWebsite,
  flushMsg,
  flushTx,
  selectHostname,
  setMsg,
  setTx,
  setTxData,
} from '../application/redux/actions/connect';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import {
  masterPubKeySelector,
  restorerOptsSelector,
  utxosSelector,
} from '../application/redux/selectors/wallet.selector';
import { masterPubKeyRestorerFromState, MasterPublicKey, RecipientInterface } from 'ldk';
import {
  incrementAddressIndex,
  incrementChangeAddressIndex,
} from '../application/redux/actions/wallet';
import { lbtcAssetByNetwork } from '../application/utils';
import { walletTransactions } from '../application/redux/selectors/transaction.selector';
import { balancesSelector } from '../application/redux/selectors/balance.selector';
import { assetGetterFromIAssets } from '../domain/assets';
import { Balance } from 'marina-provider';

export default class MarinaBroker extends Broker {
  private static NotSetUpError = new Error('proxy store and/or cache are not set up');
  private emitter: SafeEventEmitter;
  private cache: StoreCache;
  private hostname: string;

  constructor(hostname = '', brokerOpts?: BrokerOption[]) {
    super(brokerOpts);

    this.emitter = new SafeEventEmitter();
    this.hostname = hostname;
    this.cache = newStoreCache();
    this.subscribeToStoreEvents();
  }

  // start the store.subscribe function
  // used in `Broker.WithProxyStore` option
  private subscribeToStoreEvents() {
    if (!this.store) throw MarinaBroker.NotSetUpError;

    this.store.subscribe(() => {
      if (!this.store) throw MarinaBroker.NotSetUpError;
      const state = this.store.getState();
      const newCache = newCacheFromState(state);
      const events = compareCacheForEvents(newCache, this.cache, this.hostname);

      this.cache = newCache; // update the cache state

      for (const ev of events) {
        window.dispatchEvent(
          new CustomEvent(`marina_event_${ev.type.toLowerCase()}`, {
            detail: stringify(ev.payload),
          })
        );
      }
    });
  }

  private hostnameEnabled(state: RootReducerState): boolean {
    const enabledSites = state.connect.enabledSites[state.app.network];
    return enabledSites.includes(this.hostname);
  }

  private checkHostnameAuthorization(state: RootReducerState) {
    if (!this.hostnameEnabled(state)) throw new Error('User must authorize the current website');
  }

  marinaMessageHandler: MessageHandler = async ({ id, name, params }: RequestMessage) => {
    if (!this.store || !this.hostname) throw MarinaBroker.NotSetUpError;
    const state = this.store.getState();
    const successMsg = (data?: any) => newSuccessResponseMessage(id, data);

    try {
      switch (name) {
        case Marina.prototype.getNetwork.name: {
          return successMsg(state.app.network);
        }

        case Marina.prototype.isEnabled.name: {
          return successMsg(this.hostnameEnabled(state));
        }

        case Marina.prototype.enable.name: {
          if (!this.hostnameEnabled(state)) {
            this.store.dispatch(selectHostname(this.hostname, state.app.network));
            await this.openAndWaitPopup<void>('enable');
            return successMsg();
          }
          throw new Error('current site is already enabled');
        }

        case Marina.prototype.disable.name: {
          this.store.dispatch(disableWebsite(this.hostname, state.app.network));
          return successMsg();
        }

        case Marina.prototype.getAddresses.name: {
          this.checkHostnameAuthorization(state);
          const xpub = await getRestoredXPub(state);
          return successMsg(await xpub.getAddresses());
        }

        case Marina.prototype.getNextAddress.name: {
          this.checkHostnameAuthorization(state);
          const xpub = await getRestoredXPub(state);
          const nextAddress = await xpub.getNextAddress();
          this.store.dispatch(incrementAddressIndex());
          return successMsg(nextAddress);
        }

        case Marina.prototype.getNextChangeAddress.name: {
          this.checkHostnameAuthorization(state);
          const xpub = await getRestoredXPub(state);
          const nextChangeAddress = await xpub.getNextChangeAddress();
          this.store.dispatch(incrementChangeAddressIndex());
          return successMsg(nextChangeAddress);
        }

        case Marina.prototype.signTransaction.name: {
          this.checkHostnameAuthorization(state);
          if (!params || params.length !== 1) {
            throw new Error('Missing params');
          }
          const [tx] = params;
          this.store.dispatch(setTx(this.hostname, tx));
          const { accepted, signedTxHex } = await this.openAndWaitPopup<{
            accepted: boolean;
            signedTxHex: string;
          }>('sign-tx');

          this.store.dispatch(flushTx());
          if (!accepted) throw new Error('User rejected the sign request');

          return successMsg(signedTxHex);
        }

        case Marina.prototype.sendTransaction.name: {
          this.checkHostnameAuthorization(state);
          const [recipients, feeAssetHash] = params as [RecipientInterface[], string | undefined];
          const lbtc = lbtcAssetByNetwork(state.app.network);
          const feeAsset = feeAssetHash ? feeAssetHash : lbtc;

          if (![lbtc, ...state.taxi.taxiAssets].includes(feeAsset)) {
            throw new Error(`${feeAsset} not supported as fee asset.`);
          }

          this.store.dispatch(setTxData(this.hostname, recipients, feeAsset, state.app.network));
          const { accepted, signedTx } = await this.openAndWaitPopup<{
            accepted: boolean;
            signedTx: string;
          }>('spend');
          if (!accepted) throw new Error('the user rejected the create tx request');
          return successMsg(signedTx);
        }

        case Marina.prototype.signMessage.name: {
          this.checkHostnameAuthorization(state);
          if (!params || params.length !== 1 || params.some((p) => p === null)) {
            throw new Error('Missing params');
          }
          const [message] = params as [string];
          this.store.dispatch(setMsg(this.hostname, message));
          const { accepted, signedMessage } = await this.openAndWaitPopup<{
            accepted: boolean;
            signedMessage: string;
          }>('sign-msg');

          this.store.dispatch(flushMsg());
          if (!accepted) throw new Error('user rejected the signMessage request');

          return successMsg(signedMessage);
        }

        case Marina.prototype.getTransactions.name: {
          this.checkHostnameAuthorization(state);
          const transactions = walletTransactions(state);
          return successMsg(transactions);
        }

        case Marina.prototype.getCoins.name: {
          this.checkHostnameAuthorization(state);
          const coins = utxosSelector(state);
          return successMsg(coins);
        }

        case Marina.prototype.getBalances.name: {
          this.checkHostnameAuthorization(state);
          const balances = balancesSelector(state);
          const assetGetter = assetGetterFromIAssets(state.assets);
          const balancesResult: Balance[] = [];
          for (const [assetHash, amount] of Object.entries(balances)) {
            balancesResult.push({ asset: assetGetter(assetHash), amount });
          }
          return successMsg(balancesResult);
        }

        case Marina.prototype.isReady.name: {
          try {
            await getRestoredXPub(state); // check if Xpub is valid
            return successMsg(state.app.isOnboardingCompleted);
          } catch {
            // catch error = not ready
            return successMsg(false);
          }
        }

        case Marina.prototype.getFeeAssets.name: {
          this.checkHostnameAuthorization(state);
          const lbtcAsset = lbtcAssetByNetwork(state.app.network);
          return successMsg([lbtcAsset, ...state.taxi.taxiAssets]);
        }

        default:
          return newErrorResponseMessage(id, new Error('Method not implemented.'));
      }
    } catch (err) {
      if (err instanceof Error) return newErrorResponseMessage(id, err);
      else throw err;
    }
  };

  private async openAndWaitPopup<T>(
    popupName: 'enable' | 'sign-msg' | 'sign-tx' | 'spend'
  ): Promise<T> {
    await createBrowserPopup(popupName);
    return this.waitForEvent<T>(popupName);
  }
}

const POPUP_HTML = 'popup.html';

function createBrowserPopup(name?: string): Promise<Windows.Window> {
  const options = {
    url: `${POPUP_HTML}#/connect/${name}`,
    type: 'popup',
    height: 600,
    width: 360,
    focused: true,
    left: 100,
    top: 100,
  };
  return browser.windows.create(options as any);
}

function getRestoredXPub(state: RootReducerState): Promise<MasterPublicKey> {
  const xPubKey = masterPubKeySelector(state);
  const opts = restorerOptsSelector(state);
  return masterPubKeyRestorerFromState(xPubKey)(opts);
}
