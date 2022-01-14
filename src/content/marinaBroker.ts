import { stringify } from '../application/utils/browser-storage-converters';
import { compareCacheForEvents, newCacheFromState, newStoreCache, StoreCache } from './store-cache';
import Broker, { BrokerOption } from './broker';
import {
  MessageHandler,
  newErrorResponseMessage,
  newSuccessResponseMessage,
  RequestMessage,
} from '../domain/message';
import Marina from '../inject/marina';
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
import {
  masterPubKeySelector,
  restorerOptsSelector,
  utxosSelector,
} from '../application/redux/selectors/wallet.selector';
import { masterPubKeyRestorerFromState, MasterPublicKey, getAsset, getSats } from 'ldk';
import {
  incrementAddressIndex,
  incrementChangeAddressIndex,
} from '../application/redux/actions/wallet';
import { lbtcAssetByNetwork, sortRecipients, broadcastTx } from '../application/utils';
import { walletTransactions } from '../application/redux/selectors/transaction.selector';
import { balancesSelector } from '../application/redux/selectors/balance.selector';
import { assetGetterFromIAssets } from '../domain/assets';
import { Balance, Recipient, Utxo } from 'marina-provider';
import { SignTransactionPopupResponse } from '../presentation/connect/sign-pset';
import { SpendPopupResponse } from '../presentation/connect/spend';
import { SignMessagePopupResponse } from '../presentation/connect/sign-msg';
import { selectEsploraURL } from '../application/redux/selectors/app.selector';

export default class MarinaBroker extends Broker {
  private static NotSetUpError = new Error('proxy store and/or cache are not set up');
  private cache: StoreCache;
  private hostname: string;

  static async Start(hostname?: string) {
    const broker = new MarinaBroker(hostname, [await MarinaBroker.WithProxyStore()]);
    broker.start();
  }

  private constructor(hostname = '', brokerOpts?: BrokerOption[]) {
    super(brokerOpts);
    this.hostname = hostname;
    this.cache = newStoreCache();
    this.subscribeToStoreEvents();
  }

  start() {
    super.start(this.marinaMessageHandler);
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

  private marinaMessageHandler: MessageHandler = async ({ id, name, params }: RequestMessage) => {
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
            await this.store.dispatchAsync(selectHostname(this.hostname, state.app.network));
            const accepted = await this.openAndWaitPopup<boolean>('enable');
            if (!accepted) throw new Error(`user rejected to enable ${this.hostname}`);
            return successMsg();
          }
          throw new Error('current site is already enabled');
        }

        case Marina.prototype.disable.name: {
          await this.store.dispatchAsync(disableWebsite(this.hostname, state.app.network));
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
          await this.store.dispatchAsync(incrementAddressIndex());
          return successMsg(nextAddress);
        }

        case Marina.prototype.getNextChangeAddress.name: {
          this.checkHostnameAuthorization(state);
          const xpub = await getRestoredXPub(state);
          const nextChangeAddress = await xpub.getNextChangeAddress();
          await this.store.dispatchAsync(incrementChangeAddressIndex());
          return successMsg(nextChangeAddress);
        }

        case Marina.prototype.signTransaction.name: {
          this.checkHostnameAuthorization(state);
          if (!params || params.length !== 1) {
            throw new Error('Missing params');
          }
          const [pset] = params;
          await this.store.dispatchAsync(setTx(this.hostname, pset));
          const { accepted, signedPset } =
            await this.openAndWaitPopup<SignTransactionPopupResponse>('sign-pset');

          await this.store.dispatchAsync(flushTx());
          if (!accepted) throw new Error('User rejected the sign request');
          if (!signedPset) throw new Error('Something went wrong with tx signing');

          return successMsg(signedPset);
        }

        case Marina.prototype.sendTransaction.name: {
          this.checkHostnameAuthorization(state);
          const [recipients, feeAssetHash] = params as [Recipient[], string | undefined];
          const lbtc = lbtcAssetByNetwork(state.app.network);
          const feeAsset = feeAssetHash ? feeAssetHash : lbtc;

          if (![lbtc, ...state.taxi.taxiAssets].includes(feeAsset)) {
            throw new Error(`${feeAsset} not supported as fee asset.`);
          }

          const { addressRecipients, data } = sortRecipients(recipients);

          await this.store.dispatchAsync(
            setTxData(this.hostname, addressRecipients, feeAsset, state.app.network, data)
          );
          const { accepted, signedTxHex } = await this.openAndWaitPopup<SpendPopupResponse>(
            'spend'
          );

          if (!accepted) throw new Error('the user rejected the create tx request');
          if (!signedTxHex) throw new Error('something went wrong with the tx crafting');

          let txid;

          try {
            txid = await broadcastTx(selectEsploraURL(state), signedTxHex);
          } catch (error) {
            console.error(error);
          }

          if (!txid) throw new Error('something went wrong with the tx broadcasting');
          console.debug(txid);
          return successMsg(txid);
        }

        case Marina.prototype.signMessage.name: {
          this.checkHostnameAuthorization(state);
          const [message] = params as [string];
          await this.store.dispatchAsync(setMsg(this.hostname, message));
          const { accepted, signedMessage } = await this.openAndWaitPopup<SignMessagePopupResponse>(
            'sign-msg'
          );

          await this.store.dispatchAsync(flushMsg());
          if (!accepted) throw new Error('user rejected the signMessage request');
          if (!signedMessage) throw new Error('something went wrong with message signing');

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
          const results: Utxo[] = coins.map((unblindedOutput) => ({
            txid: unblindedOutput.txid,
            vout: unblindedOutput.vout,
            asset: getAsset(unblindedOutput),
            value: getSats(unblindedOutput),
          }));
          return successMsg(results);
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
}

function getRestoredXPub(state: RootReducerState): Promise<MasterPublicKey> {
  const xPubKey = masterPubKeySelector(state);
  const opts = restorerOptsSelector(state);
  return masterPubKeyRestorerFromState(xPubKey)(opts);
}
