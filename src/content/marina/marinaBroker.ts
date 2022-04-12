import { stringify } from '../../application/utils/browser-storage-converters';
import type { StoreCache } from '../store-cache';
import { compareCacheForEvents, newCacheFromState, newStoreCache } from '../store-cache';
import type { BrokerOption } from '../broker';
import Broker from '../broker';
import type { MessageHandler } from '../../domain/message';
import { newErrorResponseMessage, newSuccessResponseMessage } from '../../domain/message';
import Marina from '../../inject/marina/provider';
import type { RootReducerState } from '../../domain/common';
import {
  disableWebsite,
  flushMsg,
  flushTx,
  selectHostname,
  setCreateAccountData,
  setMsg,
  setTx,
  setTxData,
} from '../../application/redux/actions/connect';
import {
  selectAllAccountsIDs,
  selectMainAccount,
  selectTransactions,
  selectUtxos,
} from '../../application/redux/selectors/wallet.selector';
import {
  incrementAddressIndex,
  incrementChangeAddressIndex,
  setCovenantTemplate,
} from '../../application/redux/actions/wallet';
import { selectBalances } from '../../application/redux/selectors/balance.selector';
import { assetGetterFromIAssets } from '../../domain/assets';
import type { Balance, Recipient, Utxo } from 'marina-provider';
import type { SignTransactionPopupResponse } from '../../presentation/connect/sign-pset';
import type { SpendPopupResponse } from '../../presentation/connect/spend';
import type { SignMessagePopupResponse } from '../../presentation/connect/sign-msg';
import type { AccountID, CovenantAccountData } from '../../domain/account';
import { AccountType, MainAccountID } from '../../domain/account';
import { getAsset, getSats } from 'ldk';
import { selectEsploraURL, selectNetwork } from '../../application/redux/selectors/app.selector';
import { broadcastTx, lbtcAssetByNetwork } from '../../application/utils/network';
import { sortRecipients } from '../../application/utils/transaction';
import { selectTaxiAssets } from '../../application/redux/selectors/taxi.selector';
import { sleep } from '../../application/utils/common';
import type { BrokerProxyStore } from '../brokerProxyStore';
import { updateTaskAction } from '../../application/redux/actions/updater';
import type { CreateAccountPopupResponse } from '../../presentation/connect/create-account';

export default class MarinaBroker extends Broker<keyof Marina> {
  private static NotSetUpError = new Error('proxy store and/or cache are not set up');
  private cache: StoreCache;
  private hostname: string;
  private selectedAccount: AccountID = 'mainAccount';

  static async Start(hostname?: string) {
    const broker = new MarinaBroker(hostname, [await MarinaBroker.WithProxyStore()]);
    broker.start();
  }

  private constructor(hostname = '', brokerOpts?: BrokerOption[]) {
    super(Marina.PROVIDER_NAME, brokerOpts);
    this.hostname = hostname;
    this.cache = newStoreCache();
    this.subscribeToStoreEvents();
  }

  protected start() {
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

  private async reloadCoins(store: BrokerProxyStore) {
    const state = store.getState();
    const network = selectNetwork(state);
    const allAccountsIds = selectAllAccountsIDs(state);
    const makeUpdateTaskForId = (id: AccountID) => updateTaskAction(id, network);
    allAccountsIds.map(makeUpdateTaskForId).map((x: any) => store.dispatch(x));
    // wait for updates to finish, give it 1 second to start the update
    // we need to sleep to free the event loop to take care of the update tasks
    do {
      await sleep(1000);
    } while (store.getState().wallet.updaterLoaders !== 0);
    // return new state
    return store.getState();
  }

  private accountExists(name: string): boolean {
    if (!this.store) throw MarinaBroker.NotSetUpError;
    return selectAllAccountsIDs(this.store.getState()).includes(name);
  }

  private marinaMessageHandler: MessageHandler<keyof Marina> = async ({ id, name, params }) => {
    if (!this.store || !this.hostname) throw MarinaBroker.NotSetUpError;
    let state = this.store.getState();
    const successMsg = <T = any>(data?: T) => newSuccessResponseMessage(id, data);

    try {
      switch (name) {
        case 'getNetwork': {
          return successMsg(state.app.network);
        }

        case 'isEnabled': {
          return successMsg(this.hostnameEnabled(state));
        }

        case 'enable': {
          if (!this.hostnameEnabled(state)) {
            await this.store.dispatchAsync(selectHostname(this.hostname, state.app.network));
            const accepted = await this.openAndWaitPopup<boolean>('enable');
            if (!accepted) throw new Error(`user rejected to enable ${this.hostname}`);
            return successMsg();
          }
          throw new Error('current site is already enabled');
        }

        case 'disable': {
          await this.store.dispatchAsync(disableWebsite(this.hostname, state.app.network));
          return successMsg();
        }

        case 'getAddresses': {
          this.checkHostnameAuthorization(state);
          const net = selectNetwork(state);
          const xpub = await selectMainAccount(state).getWatchIdentity(net);
          return successMsg(await xpub.getAddresses());
        }

        case 'getNextAddress': {
          this.checkHostnameAuthorization(state);
          const account = selectMainAccount(state);
          const net = selectNetwork(state);
          const xpub = await account.getWatchIdentity(net);
          const nextAddress = await xpub.getNextAddress();
          await this.store.dispatchAsync(incrementAddressIndex(account.getAccountID(), net));
          return successMsg(nextAddress);
        }

        case 'getNextChangeAddress': {
          this.checkHostnameAuthorization(state);
          const account = selectMainAccount(state);
          const net = selectNetwork(state);
          const xpub = await account.getWatchIdentity(net);
          const nextChangeAddress = await xpub.getNextChangeAddress();
          await this.store.dispatchAsync(incrementChangeAddressIndex(account.getAccountID(), net));
          return successMsg(nextChangeAddress);
        }

        case 'signTransaction': {
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

        case 'sendTransaction': {
          this.checkHostnameAuthorization(state);
          const [recipients, feeAssetHash] = params as [Recipient[], string | undefined];
          const lbtc = lbtcAssetByNetwork(selectNetwork(state));
          const feeAsset = feeAssetHash ? feeAssetHash : lbtc;

          // validate if fee asset is valid
          if (![lbtc, ...selectTaxiAssets(state)].includes(feeAsset)) {
            throw new Error(`${feeAsset} not supported as fee asset.`);
          }

          // validate object recipient (asset and value)
          // - if no asset is present, assume lbtc for the current network
          // - value must be present, a safe integer and higher or equal to zero
          // - if value is for example 1.0, parseInt it to eliminate float
          for (const rcpt of recipients) {
            if (!rcpt.asset) {
              if (!lbtc) throw new Error('missing asset on recipient');
              rcpt.asset = lbtc;
            }
            if (!rcpt.value) throw new Error('missing value on recipient');
            if (!Number.isSafeInteger(rcpt.value)) throw new Error('invalid value on recipient');
            if (rcpt.value < 0) throw new Error('negative value on recipient');
            rcpt.value = parseInt(rcpt.value.toString(), 10);
          }

          const { addressRecipients, data } = sortRecipients(recipients);

          await this.store.dispatchAsync(
            setTxData(this.hostname, addressRecipients, feeAsset, selectNetwork(state), data)
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
            throw new Error(`error broadcasting tx: ${error}`);
          }

          if (!txid) throw new Error('something went wrong with the tx broadcasting');

          return successMsg({ txid, hex: signedTxHex });
        }

        case 'signMessage': {
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

        case 'getTransactions': {
          this.checkHostnameAuthorization(state);
          const transactions = selectTransactions(MainAccountID)(state);
          return successMsg(transactions);
        }

        case 'getCoins': {
          this.checkHostnameAuthorization(state);
          const coins = selectUtxos(MainAccountID)(state);
          const results: Utxo[] = coins.map((unblindedOutput) => ({
            txid: unblindedOutput.txid,
            vout: unblindedOutput.vout,
            asset: getAsset(unblindedOutput),
            value: getSats(unblindedOutput),
          }));
          return successMsg(results);
        }

        case 'getBalances': {
          this.checkHostnameAuthorization(state);
          const balances = selectBalances(MainAccountID)(state);
          const assetGetter = assetGetterFromIAssets(state.assets);
          const balancesResult: Balance[] = [];
          for (const [assetHash, amount] of Object.entries(balances)) {
            balancesResult.push({ asset: assetGetter(assetHash), amount });
          }
          return successMsg(balancesResult);
        }

        case 'isReady': {
          try {
            const net = selectNetwork(state);
            await selectMainAccount(state).getWatchIdentity(net); // check if Xpub is valid
            return successMsg(state.app.isOnboardingCompleted);
          } catch {
            // catch error = not ready
            return successMsg(false);
          }
        }

        case 'getFeeAssets': {
          this.checkHostnameAuthorization(state);
          const lbtcAsset = lbtcAssetByNetwork(selectNetwork(state));
          return successMsg([lbtcAsset, ...selectTaxiAssets(state)]);
        }

        case 'reloadCoins': {
          this.checkHostnameAuthorization(state);
          state = await this.reloadCoins(this.store);
          return successMsg();
        }

        case 'getSelectedAccount': {
          this.checkHostnameAuthorization(state);
          return successMsg(this.selectedAccount);
        }

        case 'useAccount': {
          this.checkHostnameAuthorization(state);
          const [accountName] = params as [string];
          if (!this.accountExists(accountName)) {
            throw new Error(`Account ${accountName} not found`);
          }

          this.selectedAccount = accountName;
          return successMsg(true);
        }

        case 'importTemplate': {
          this.checkHostnameAuthorization(state);
          const accountData = state.wallet.accounts[this.selectedAccount];
          if (accountData.type !== AccountType.CovenantAccount) {
            throw new Error('Only covenant accounts can import templates');
          }

          if ((accountData as CovenantAccountData).covenantDescriptors.template) {
            throw new Error('This account already has a template');
          }

          const [template] = params as [string];
          await this.store.dispatchAsync(setCovenantTemplate(this.selectedAccount, template));
          return successMsg(true);
        }

        case 'createAccount': {
          this.checkHostnameAuthorization(state);
          const [accountName] = params as [string];
          if (this.accountExists(accountName)) {
            throw new Error(`Account ${accountName} already exists`);
          }

          await this.store.dispatchAsync(
            setCreateAccountData({
              namespace: accountName,
              hostname: this.hostname,
            })
          );

          const { accepted } = await this.openAndWaitPopup<CreateAccountPopupResponse>(
            'create-account'
          );
          if (!accepted) throw new Error('user rejected the create account request');

          return successMsg(accepted);
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
