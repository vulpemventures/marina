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
  selectAccount,
  selectAllAccountsIDs,
  selectMainAccount,
  selectTransactions,
  selectUtxos,
} from '../../application/redux/selectors/wallet.selector';
import {
  incrementAddressIndex,
  incrementChangeAddressIndex,
  setCustomScriptTemplate,
  setIsSpendableByMarina,
} from '../../application/redux/actions/wallet';
import { selectBalances } from '../../application/redux/selectors/balance.selector';
import { assetGetterFromIAssets } from '../../domain/assets';
import type { Balance, DescriptorTemplate, Recipient, Utxo } from 'marina-provider';
import type { SignTransactionPopupResponse } from '../../presentation/connect/sign-pset';
import type { SpendPopupResponse } from '../../presentation/connect/spend';
import type { SignMessagePopupResponse } from '../../presentation/connect/sign-msg';
import type { AccountID } from '../../domain/account';
import { AccountType, MainAccountID } from '../../domain/account';
import { ScriptInputsNeeds, validate } from 'ldk';
import { analyzeTapscriptTree, getAsset, getSats } from 'ldk';
import { selectEsploraURL, selectNetwork } from '../../application/redux/selectors/app.selector';
import { broadcastTx, lbtcAssetByNetwork } from '../../application/utils/network';
import { sortRecipients } from '../../application/utils/transaction';
import { selectTaxiAssets } from '../../application/redux/selectors/taxi.selector';
import { sleep } from '../../application/utils/common';
import type { BrokerProxyStore } from '../brokerProxyStore';
import { updateTaskAction } from '../../application/redux/actions/updater';
import type { CreateAccountPopupResponse } from '../../presentation/connect/create-account';
import type { CustomScriptIdentityWatchOnly, TaprootAddressInterface } from '../../domain/customscript-identity';
import { addUnconfirmedUtxos, lockUtxo } from '../../application/redux/actions/utxos';

export default class MarinaBroker extends Broker<keyof Marina> {
  private static NotSetUpError = new Error('proxy store and/or cache are not set up');
  private cache: StoreCache;
  private hostname: string;
  private selectedAccount: AccountID = MainAccountID;

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

  private get accountSelector() {
    return selectAccount(this.selectedAccount);
  }

  private hostnameEnabled(state: RootReducerState): boolean {
    const enabledSites = state.connect.enabledSites[state.app.network];
    return enabledSites.includes(this.hostname);
  }

  private checkHostnameAuthorization() {
    if (!this.hostnameEnabled(this.state)) throw new Error('User must authorize the current website');
  }

  get state() {
    if (!this.store) throw MarinaBroker.NotSetUpError;
    return this.store.getState();
  }

  private async reloadCoins(store: BrokerProxyStore) {
    const network = selectNetwork(this.state);
    const allAccountsIds = selectAllAccountsIDs(this.state);
    const makeUpdateTaskForId = (id: AccountID) => updateTaskAction(id, network);
    allAccountsIds.map(makeUpdateTaskForId).map((x: any) => store.dispatch(x));
    // wait for updates to finish, give it 1 second to start the update
    // we need to sleep to free the event loop to take care of the update tasks
    do {
      await sleep(1000);
    } while (store.getState().wallet.updaterLoaders !== 0);
  }

  private accountExists(name: string): boolean {
    if (!this.store) throw MarinaBroker.NotSetUpError;
    return selectAllAccountsIDs(this.store.getState()).includes(name);
  }

  private marinaMessageHandler: MessageHandler<keyof Marina> = async ({ id, name, params }) => {
    if (!this.store || !this.hostname) throw MarinaBroker.NotSetUpError;
    const successMsg = <T = any>(data?: T) => newSuccessResponseMessage(id, data);

    try {
      switch (name) {
        case 'getNetwork': {
          return successMsg(this.state.app.network);
        }

        case 'isEnabled': {
          return successMsg(this.hostnameEnabled(this.state));
        }

        case 'enable': {
          if (!this.hostnameEnabled(this.state)) {
            await this.store.dispatchAsync(selectHostname(this.hostname, this.state.app.network));
            const accepted = await this.openAndWaitPopup<boolean>('enable');
            if (!accepted) throw new Error(`user rejected to enable ${this.hostname}`);
            return successMsg();
          }
          throw new Error('current site is already enabled');
        }

        case 'disable': {
          await this.store.dispatchAsync(disableWebsite(this.hostname, this.state.app.network));
          return successMsg();
        }

        case 'getAddresses': {
          this.checkHostnameAuthorization();
          const net = selectNetwork(this.state);
          const watchOnlyIdentity = await this.accountSelector(this.state).getWatchIdentity(net);
          return successMsg(await watchOnlyIdentity.getAddresses());
        }

        case 'getNextAddress': {
          this.checkHostnameAuthorization();
          const account = this.accountSelector(this.state);
          const net = selectNetwork(this.state);
          const watchOnlyIdentity = await account.getWatchIdentity(net);
          const nextAddress = await watchOnlyIdentity.getNextAddress();
          await this.store.dispatchAsync(incrementAddressIndex(account.getAccountID(), net));
          return successMsg(nextAddress);
        }

        case 'getNextChangeAddress': {
          this.checkHostnameAuthorization();
          const account = this.accountSelector(this.state);
          const net = selectNetwork(this.state);
          const xpub = await account.getWatchIdentity(net);
          const nextChangeAddress = await xpub.getNextChangeAddress();
          await this.store.dispatchAsync(incrementChangeAddressIndex(account.getAccountID(), net));
          return successMsg(nextChangeAddress);
        }

        case 'signTransaction': {
          this.checkHostnameAuthorization();
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
          this.checkHostnameAuthorization();
          const [recipients, feeAssetHash] = params as [Recipient[], string | undefined];
          const lbtc = lbtcAssetByNetwork(selectNetwork(this.state));
          const feeAsset = feeAssetHash ? feeAssetHash : lbtc;

          // validate if fee asset is valid
          if (![lbtc, ...selectTaxiAssets(this.state)].includes(feeAsset)) {
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
            setTxData(this.hostname, addressRecipients, feeAsset, selectNetwork(this.state), data)
          );

          const { accepted, signedTxHex, selectedUtxos, unconfirmedOutputs } =
            await this.openAndWaitPopup<SpendPopupResponse>('spend');

          if (!accepted) throw new Error('the user rejected the create tx request');
          if (!signedTxHex) throw new Error('something went wrong with the tx crafting');

          const txid = await broadcastTx(selectEsploraURL(this.state), signedTxHex);
          if (!txid) throw new Error('something went wrong with the tx broadcasting');

          // lock utxos used in successful broadcast
          if (selectedUtxos) {
            for (const utxo of selectedUtxos) {
              await this.store.dispatchAsync(lockUtxo(utxo));
            }
          }

          // add unconfirmed utxos from change addresses to utxo set
          if (unconfirmedOutputs && unconfirmedOutputs.length > 0) {
            this.store.dispatch(
              await addUnconfirmedUtxos(
                signedTxHex,
                unconfirmedOutputs,
                MainAccountID,
                selectNetwork(this.state)
              )
            );
          }

          return successMsg({ txid, hex: signedTxHex });
        }

        case 'signMessage': {
          this.checkHostnameAuthorization();
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
          this.checkHostnameAuthorization();
          const transactions = selectTransactions(this.selectedAccount)(this.state);
          return successMsg(transactions);
        }

        case 'getCoins': {
          this.checkHostnameAuthorization();
          const coins = selectUtxos(this.selectedAccount)(this.state);
          const results: Utxo[] = coins.map((unblindedOutput) => ({
            txid: unblindedOutput.txid,
            vout: unblindedOutput.vout,
            prevout: unblindedOutput.prevout,
            unblindData: unblindedOutput.unblindData,
            asset: getAsset(unblindedOutput),
            value: getSats(unblindedOutput),
          }));
          return successMsg(results);
        }

        case 'getBalances': {
          this.checkHostnameAuthorization();
          const balances = selectBalances(this.selectedAccount)(this.state);
          const assetGetter = assetGetterFromIAssets(this.state.assets);
          const balancesResult: Balance[] = [];
          for (const [assetHash, amount] of Object.entries(balances)) {
            balancesResult.push({ asset: assetGetter(assetHash), amount });
          }
          return successMsg(balancesResult);
        }

        case 'isReady': {
          try {
            const net = selectNetwork(this.state);
            await selectMainAccount(this.state).getWatchIdentity(net); // check if Xpub is valid
            return successMsg(this.state.app.isOnboardingCompleted);
          } catch {
            // catch error = not ready
            return successMsg(false);
          }
        }

        case 'getFeeAssets': {
          this.checkHostnameAuthorization();
          const lbtcAsset = lbtcAssetByNetwork(selectNetwork(this.state));
          return successMsg([lbtcAsset, ...selectTaxiAssets(this.state)]);
        }

        case 'reloadCoins': {
          this.checkHostnameAuthorization();
          await this.reloadCoins(this.store);
          return successMsg();
        }

        case 'getSelectedAccount': {
          this.checkHostnameAuthorization();
          return successMsg(this.selectedAccount);
        }

        case 'useAccount': {
          this.checkHostnameAuthorization();
          const [accountName] = params as [string];
          if (!this.accountExists(accountName)) {
            throw new Error(`Account ${accountName} not found`);
          }

          this.selectedAccount = accountName;
          return successMsg(true);
        }

        case 'importTemplate': {
          this.checkHostnameAuthorization();
          const accountData = this.state.wallet.accounts[this.selectedAccount];
          if (accountData.type !== AccountType.CustomScriptAccount) {
            throw new Error('Only custom script accounts can import templates');
          }

          const [covenant, changeCovenant] = params as [DescriptorTemplate, DescriptorTemplate?];
          if (!validate(covenant.template)) {
            throw new Error('Invalid template');
          }

          if (changeCovenant && !validate(changeCovenant.template)) {
            throw new Error('Invalid change template');
          }

          await this.store.dispatchAsync(
            setCustomScriptTemplate(this.selectedAccount, covenant.template, changeCovenant?.template)
          );

          const selectedAccount = selectAccount(this.selectedAccount)(this.state);
          const watchIdentity = await selectedAccount.getWatchIdentity(selectNetwork(this.state));

          const nextAddress = (await watchIdentity.getNextAddress()) as TaprootAddressInterface;
          const autoSpendableLeaf = (needsOfLeaf: ScriptInputsNeeds) =>
            needsOfLeaf.sigs.length === 1 &&
            !needsOfLeaf.needParameters &&
            !needsOfLeaf.hasIntrospection;
          let isSpendableByMarina = Object.values(
            analyzeTapscriptTree(nextAddress.taprootHashTree)
          ).some(autoSpendableLeaf);

          if (changeCovenant) {
            const nextChangeAddress =
              (await watchIdentity.getNextChangeAddress()) as TaprootAddressInterface;
            isSpendableByMarina ||= Object.values(
              analyzeTapscriptTree(nextChangeAddress.TaprootAddressInterface)
            ).some(autoSpendableLeaf);
          }

          await this.store.dispatchAsync(
            setIsSpendableByMarina(this.selectedAccount, isSpendableByMarina)
          );
          return successMsg(true);
        }

        case 'createAccount': {
          this.checkHostnameAuthorization();
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
