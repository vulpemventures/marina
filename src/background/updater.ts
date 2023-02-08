import { Transaction } from 'liquidjs-lib';
import zkp from '@vulpemventures/secp256k1-zkp';
import Browser from 'webextension-polyfill';
import type { Unblinder } from '../domain/unblinder';
import { WalletRepositoryUnblinder } from '../domain/unblinder';
import type { TxDetails, UnblindingData } from '../domain/transaction';
import type {
  WalletRepository,
  AppRepository,
  AssetRepository,
} from '../infrastructure/repository';
import { TxIDsKey, TxDetailsKey } from '../infrastructure/storage/wallet-repository';

// this is OK because we have set up topLevelAwait in webpack config
const zkpLib = await zkp();

/**
 * Updater is a class that listens to the chrome storage changes and triggers the right actions
 * to update the wallet state.
 * Each time a new script or transaction is added to the storage, tries to update and unblind utxos set.
 */
export class Updater {
  static ALARM = 'updater-crawler-alarm';

  private unblinder: Unblinder;
  private listener:
    | ((changes: Record<string, Browser.Storage.StorageChange>) => Promise<void>)
    | undefined;

  constructor(
    private walletRepository: WalletRepository,
    private appRepository: AppRepository,
    assetRepository: AssetRepository
  ) {
    this.unblinder = new WalletRepositoryUnblinder(
      walletRepository,
      appRepository,
      assetRepository,
      zkpLib
    );
  }

  // set up the onChanged chrome storage listener
  async start() {
    if (this.listener) await this.stop();
    this.listener = this.onChangesListener();
    Browser.storage.onChanged.addListener(this.listener);
  }

  // remove the onChanged chrome storage listener
  async stop() {
    await Browser.alarms.clear(Updater.ALARM).catch(console.error); // ignore errors
    if (this.listener) {
      Browser.storage.onChanged.removeListener(this.listener);
      this.listener = undefined;
    }
  }

  // onChangesListener iterates over the storage changes to trigger the right actions
  private onChangesListener() {
    return async (changes: Record<string, Browser.Storage.StorageChange>) => {
      for (const key in changes) {
        try {
          if (TxIDsKey.is(key)) {
            const [network] = TxIDsKey.decode(key);
            const newTxIDs = changes[key].newValue as string[] | undefined;
            if (!newTxIDs) continue; // it means we just deleted the key
            const oldTxIDs = changes[key].oldValue ? (changes[key].oldValue as string[]) : [];

            // for all new txs, we need to fetch the tx hex
            const oldTxIDsSet = new Set(oldTxIDs);
            const txIDsToFetch = newTxIDs.filter((txID) => !oldTxIDsSet.has(txID));
            try {
              const chainSource = await this.appRepository.getChainSource(network);
              if (!chainSource) {
                console.error('Chain source not found', network);
                continue;
              }
              const transactions = await chainSource.fetchTransactions(txIDsToFetch);
              await this.walletRepository.updateTxDetails(
                Object.fromEntries(transactions.map((tx, i) => [txIDsToFetch[i], tx]))
              );
            } catch (e) {
              console.error(e);
            }
          } else if (TxDetailsKey.is(key) && changes[key].newValue?.hex) {
            if (changes[key].oldValue && changes[key].oldValue.hex) continue;
            const [txID] = TxDetailsKey.decode(key);
            const newTxDetails = changes[key].newValue as TxDetails | undefined;
            if (!newTxDetails || !newTxDetails.hex) continue; // it means we just deleted the key
            const tx = Transaction.fromHex(newTxDetails.hex);
            const unblindedResults = await this.unblinder.unblind(...tx.outs);
            const updateArray: Array<[{ txID: string; vout: number }, UnblindingData]> = [];
            for (const [vout, unblinded] of unblindedResults.entries()) {
              if (unblinded instanceof Error) {
                console.error('Error while unblinding', unblinded);
                continue;
              }
              updateArray.push([{ txID, vout }, unblinded]);
            }
            await this.walletRepository.updateOutpointBlindingData(updateArray);
          }
        } catch (e) {
          continue;
        }
      }
    };
  }
}
