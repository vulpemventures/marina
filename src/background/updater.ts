import { Transaction } from 'liquidjs-lib';
import Browser from 'webextension-polyfill';
import type { Unblinder } from '../application/unblinder';
import { WalletRepositoryUnblinder } from '../application/unblinder';
import type { TxDetails, UnblindingData } from '../domain/transaction';
import type { WalletRepository, AppRepository, AssetRepository } from '../domain/repository';
import { TxIDsKey, TxDetailsKey } from '../infrastructure/storage/wallet-repository';
import type { ZKPInterface } from 'liquidjs-lib/src/confidential';

/**
 * Updater is a class that listens to the chrome storage changes and triggers the right actions
 * to update the wallet state.
 * Each time a new script or transaction is added to the storage, tries to update and unblind utxos set.
 */
export class UpdaterService {
  private processingCount = 0;
  private unblinder: Unblinder;
  private listener:
    | ((changes: Record<string, Browser.Storage.StorageChange>) => Promise<void>)
    | undefined;

  constructor(
    private walletRepository: WalletRepository,
    private appRepository: AppRepository,
    assetRepository: AssetRepository,
    zkpLib: ZKPInterface
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
    await this.waitForProcessing();
    if (this.listener) {
      Browser.storage.onChanged.removeListener(this.listener);
      this.listener = undefined;
    }
  }

  // onChangesListener iterates over the storage changes to trigger the right actions
  private onChangesListener() {
    return async (changes: Record<string, Browser.Storage.StorageChange>) => {
      try {
        this.processingCount += 1;
        for (const key in changes) {
          try {
            if (TxIDsKey.is(key)) {
              // for each new txID, fetch the tx hex
              const [network] = TxIDsKey.decode(key);
              const newTxIDs = changes[key].newValue as string[] | undefined;
              if (!newTxIDs) continue; // it means we just deleted the key
              try {
                await this.appRepository.updaterLoader.increment();
                const oldTxIDs = changes[key].oldValue ? (changes[key].oldValue as string[]) : [];
                // for all new txs, we need to fetch the tx hex
                const oldTxIDsSet = new Set(oldTxIDs);
                const txIDsToFetch = newTxIDs.filter(
                  (txID) => isValidTxID(txID) && !oldTxIDsSet.has(txID)
                );
                const chainSource = await this.appRepository.getChainSource(network);
                if (!chainSource) {
                  console.error('Chain source not found', network);
                  continue;
                }
                const transactions = await chainSource.fetchTransactions(txIDsToFetch);
                await chainSource.close();

                // try to unblind the outputs
                const unblindedOutpoints: Array<[{ txID: string; vout: number }, UnblindingData]> =
                  [];
                for (const { txID, hex } of transactions) {
                  const unblindedResults = await this.unblinder.unblind(
                    ...Transaction.fromHex(hex).outs
                  );
                  for (const [vout, unblinded] of unblindedResults.entries()) {
                    if (unblinded instanceof Error) {
                      if (unblinded.message === 'secp256k1_rangeproof_rewind') continue;
                      if (unblinded.message === 'Empty script: fee output') continue;
                      console.error('Error while unblinding', unblinded);
                      continue;
                    }
                    unblindedOutpoints.push([{ txID, vout }, unblinded]);
                  }
                }

                await Promise.all([
                  this.walletRepository.updateOutpointBlindingData(unblindedOutpoints),
                  this.walletRepository.updateTxDetails(
                    Object.fromEntries(transactions.map((tx, i) => [txIDsToFetch[i], tx]))
                  ),
                ]);
              } finally {
                await this.appRepository.updaterLoader.decrement();
              }
            } else if (TxDetailsKey.is(key) && changes[key].newValue?.hex) {
              // for all txs hex change in the store, we'll try unblind the outputs
              if (changes[key].oldValue && changes[key].oldValue.hex) continue;
              const [txID] = TxDetailsKey.decode(key);
              const newTxDetails = changes[key].newValue as TxDetails | undefined;
              if (!newTxDetails || !newTxDetails.hex) continue; // it means we just deleted the key
              try {
                await this.appRepository.updaterLoader.increment();
                const tx = Transaction.fromHex(newTxDetails.hex);
                const updateArray: Array<[{ txID: string; vout: number }, UnblindingData]> = [];
                for (const [vout, output] of tx.outs.entries()) {
                  const { blindingData } = await this.walletRepository.getOutputBlindingData(
                    txID,
                    vout
                  );
                  if (blindingData) continue; // already unblinded
                  const unblindResults = await this.unblinder.unblind(output);
                  if (unblindResults[0] instanceof Error) {
                    if (unblindResults[0].message === 'secp256k1_rangeproof_rewind') continue;
                    if (unblindResults[0].message === 'Empty script: fee output') continue;
                    console.error('Error while unblinding', unblindResults[0]);
                    continue;
                  }
                  updateArray.push([{ txID, vout }, unblindResults[0]]);
                }
                await this.walletRepository.updateOutpointBlindingData(updateArray);
              } finally {
                await this.appRepository.updaterLoader.decrement();
              }
            }
          } catch (e) {
            console.error('Updater silent error: ', e);
            continue;
          }
        }
      } finally {
        this.processingCount -= 1;
      }
    };
  }

  // isProcessing returns true if the updater is processing a change
  isProcessing() {
    return this.processingCount > 0;
  }

  waitForProcessing() {
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (!this.isProcessing()) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  }
}

function isValidTxID(txid: string) {
  return /^[0-9a-f]{64}$/i.test(txid);
}
