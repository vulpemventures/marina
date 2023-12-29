import type { TxOutput, confidential } from 'liquidjs-lib';
import { Transaction } from 'liquidjs-lib';
import Browser from 'webextension-polyfill';
import type { Unblinder } from './unblinder';
import { WalletRepositoryUnblinder } from './unblinder';
import type { TxDetails } from '../domain/transaction';
import type {
  WalletRepository,
  AppRepository,
  AssetRepository,
  BlockheadersRepository,
  Outpoint,
  RefundableSwapsRepository,
} from '../domain/repository';
import { TxIDsKey } from '../infrastructure/storage/wallet-repository';
import type { NetworkString, UnblindingData } from 'marina-provider';
import { AppStorageKeys } from '../infrastructure/storage/app-repository';
import type { ChainSource } from '../domain/chainsource';
import { DefaultAssetRegistry } from '../port/asset-registry';
import { AccountFactory } from './account';
import { addressFromScript } from '../extension/utility/address';

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
    private blockHeadersRepository: BlockheadersRepository,
    private assetRepository: AssetRepository,
    private refundableSwapsRepository: RefundableSwapsRepository,
    zkpLib: confidential.Confidential['zkp']
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

  async checkAndFixMissingTransactionsData(network: NetworkString) {
    this.processingCount += 1;
    try {
      await this.updateLastestHistory(network);
      const txs = await this.walletRepository.getTransactions(network);
      if (txs.length === 0) return;
      const txsDetailsRecord = await this.walletRepository.getTxDetails(...txs);
      const chainSource = await this.appRepository.getChainSource(network);
      if (!chainSource) throw new Error('Chain source not found for network ' + network);
      const newDetails = await this.fixMissingHex(chainSource, txsDetailsRecord);

      const txsDetails = [...Object.values(txsDetailsRecord), ...newDetails];
      await Promise.all([
        this.fixMissingBlockHeaders(network, chainSource, txsDetails).finally(async () => {
          await chainSource.close();
        }),
        this.fixMissingUnblindingData(txsDetails),
      ]);
      await this.fixMissingAssets(network);
    } finally {
      this.processingCount -= 1;
    }
  }

  async checkRefundableSwaps(network: NetworkString) {
    this.processingCount += 1;
    try {
      const swaps = await this.refundableSwapsRepository.getSwaps();
      console.log('swaps.length', swaps.length);
      if (swaps.length === 0) return;
      const chainSource = await this.appRepository.getChainSource(network);
      if (!chainSource) throw new Error('Chain source not found for network ' + network);
      for (const swap of swaps) {
        if (!swap.redeemScript || swap.network !== network) return;
        const fundingAddress = addressFromScript(swap.redeemScript);
        const [utxo] = await chainSource.listUnspents(fundingAddress);
        console.log('utxo', utxo);
        if (!utxo) await this.refundableSwapsRepository.removeSwap(swap);
      }
    } finally {
      this.processingCount -= 1;
    }
  }

  private async updateLastestHistory(network: NetworkString) {
    const LAST_ADDRESSES_COUNT = 30;
    const chainSource = await this.appRepository.getChainSource(network);
    if (!chainSource) throw new Error('Chain source not found for network ' + network);
    const accountFactory = await AccountFactory.create(this.walletRepository);
    const accounts = await accountFactory.makeAll(network);
    // get the last max 30 addresses for all accounts
    const scripts = [];

    for (const account of accounts) {
      const nextIndexes = await account.getNextIndexes();
      const scriptsAccounts = await this.walletRepository.getAccountScripts(network, account.name);
      const lastScripts = Object.entries(scriptsAccounts)
        .filter(([_, { derivationPath }]) => {
          if (!derivationPath) return false;
          const splittedPath = derivationPath.split('/');
          const index = splittedPath.pop();
          const isChange = splittedPath.pop();

          if (!index) return false;
          return (
            parseInt(index) >=
            (isChange ? nextIndexes.internal : nextIndexes.external) - LAST_ADDRESSES_COUNT
          );
        })
        .map(([script]) => Buffer.from(script, 'hex'));

      scripts.push(...lastScripts);
    }

    const histories = await chainSource.fetchHistories(scripts);
    await Promise.all([
      this.walletRepository.addTransactions(
        network,
        ...histories.flat().map(({ tx_hash }) => tx_hash)
      ),
      this.walletRepository.updateTxDetails(
        Object.fromEntries(histories.flat().map(({ tx_hash, height }) => [tx_hash, { height }]))
      ),
    ]);
  }

  private async fixMissingBlockHeaders(
    network: NetworkString,
    chainSource: ChainSource,
    txsDetails: TxDetails[]
  ) {
    const heightSet = new Set<number>();
    for (const txDetails of txsDetails) {
      if (txDetails.height && txDetails.height >= 0) {
        if (
          (await this.blockHeadersRepository.getBlockHeader(network, txDetails.height)) ===
          undefined
        ) {
          heightSet.add(txDetails.height);
        }
      }
    }

    const blockHeaders = await chainSource.fetchBlockHeaders(Array.from(heightSet));
    await this.blockHeadersRepository.setBlockHeaders(network, ...blockHeaders);
  }

  private async fixMissingHex(
    chainSource: ChainSource,
    txsDetails: Record<string, TxDetails>
  ): Promise<TxDetails[]> {
    const missingHexes = Object.entries(txsDetails).filter(
      ([, txDetails]) => txDetails.hex === undefined
    );
    const txIDs = missingHexes.map(([txid]) => txid);
    const transactions = await chainSource.fetchTransactions(txIDs);
    await this.walletRepository.updateTxDetails(
      transactions.reduce((acc, tx) => {
        acc[tx.txID] = { hex: tx.hex };
        return acc;
      }, {} as Record<string, TxDetails>)
    );
    return transactions.map((v, index) => ({ ...v, ...missingHexes[index][1] }));
  }

  private async fixMissingAssets(network: NetworkString) {
    const assets = await this.assetRepository.getAllAssets(network);
    const assetsToFetch = assets.filter((asset) => !asset || asset.name === 'Unknown');
    const registry = new DefaultAssetRegistry(network);
    for (const asset of assetsToFetch) {
      const assetInfo = await registry.getAsset(asset.assetHash);
      if (assetInfo) {
        await this.assetRepository.addAsset(asset.assetHash, assetInfo);
      }
    }
  }

  private async fixMissingUnblindingData(txDetails: TxDetails[]) {
    const txs = txDetails
      .filter(({ hex }) => hex !== undefined)
      .map(({ hex }) => Transaction.fromHex(hex!));
    const outpoints = txs.reduce<(TxOutput & Outpoint)[]>((acc, tx) => {
      for (const [vout, output] of tx.outs.entries()) {
        if (output.script && output.script) {
          acc.push({
            txid: tx.getId(),
            vout,
            ...output,
          });
        }
      }
      return acc;
    }, []);

    const unblindOutputsInRepo = await this.walletRepository.getOutputBlindingData(...outpoints);
    const toUnblind = unblindOutputsInRepo.filter(({ blindingData }) => blindingData === undefined);

    const outputsToUnblind = toUnblind.map(
      ({ txid, vout }) =>
        outpoints.find(({ txid: txID2, vout: vout2 }) => txid === txID2 && vout === vout2)!
    );
    const unblindedResults = await this.unblinder.unblind(...outputsToUnblind);

    const updateArray: [Outpoint, UnblindingData][] = [];
    for (const [i, unblinded] of unblindedResults.entries()) {
      const { txid, vout } = toUnblind[i];
      if (unblinded instanceof Error) {
        if (unblinded.message === 'secp256k1_rangeproof_rewind') continue;
        if (unblinded.message === 'Empty script: fee output') continue;
        console.error('Error while unblinding', unblinded);
        continue;
      }
      updateArray.push([{ txid, vout }, unblinded]);
    }

    const assetsInArray = updateArray.map(([, { asset }]) => asset);
    const toFetchAssets = [];
    for (const asset of assetsInArray) {
      const fromRepo = await this.assetRepository.getAsset(asset);
      if (!fromRepo || fromRepo.ticker === fromRepo.assetHash.substring(0, 4)) {
        toFetchAssets.push(asset);
      }
    }

    try {
      if (toFetchAssets.length > 0) {
        const network = await this.appRepository.getNetwork();
        if (network) {
          const registry = new DefaultAssetRegistry(network);
          const assets = await Promise.all(toFetchAssets.map((a) => registry.getAsset(a)));
          await Promise.allSettled(
            assets.map((asset) => this.assetRepository.addAsset(asset.assetHash, asset))
          );
        }
      }
    } catch (e) {
      console.error('Error while fetching assets', e);
    }

    await this.walletRepository.updateOutpointBlindingData(updateArray);
  }

  // onChangesListener iterates over the storage changes to trigger the right actions
  private onChangesListener() {
    return async (changes: Record<string, Browser.Storage.StorageChange>) => {
      try {
        this.processingCount += 1;
        for (const key in changes) {
          try {
            if (key === AppStorageKeys.NETWORK) {
              const newNetwork = changes[key].newValue as NetworkString | undefined;
              if (!newNetwork) continue;
              await this.checkAndFixMissingTransactionsData(newNetwork);
            } else if (TxIDsKey.is(key)) {
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

                // try to unblind the transaction outputs
                const unblindedOutpoints = await this.unblinder.unblindTxs(
                  ...transactions.map(({ hex }) => Transaction.fromHex(hex))
                );

                await Promise.all([
                  this.walletRepository.updateOutpointBlindingData(unblindedOutpoints),
                  this.walletRepository.updateTxDetails(
                    Object.fromEntries(transactions.map((tx, i) => [txIDsToFetch[i], tx]))
                  ),
                ]);

                // let's update the block headers
                const txDetails = await this.walletRepository.getTxDetails(...txIDsToFetch);
                const blockHeights = new Set<number>();
                for (const { height } of Object.values(txDetails)) {
                  if (height) blockHeights.add(height);
                }

                const blockHeaders = await chainSource.fetchBlockHeaders(Array.from(blockHeights));

                await this.blockHeadersRepository.setBlockHeaders(network, ...blockHeaders);
                await chainSource.close();
              } finally {
                await this.appRepository.updaterLoader.decrement();
              }
            }
          } catch (e) {
            console.error('Updater silent error: ');
            console.error(e);
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
