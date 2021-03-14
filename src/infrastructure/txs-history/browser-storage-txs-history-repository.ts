import { browser } from 'webextension-polyfill-ts';
import { ITxsHistoryRepository } from '../../domain/transaction/i-txs-history-repository';
import { Network } from '../../domain/app/value-objects';
import { TxsHistory, TxsHistoryByNetwork } from '../../domain/transaction';
import { parse, stringify } from '../../application/utils/browser-storage-converters';

export class BrowserStorageTxsHistoryRepo implements ITxsHistoryRepository {
  // Uint8Array in vin and vout need to be stringified to be stored
  static serializeTxsHistory(txsHistory: TxsHistory): string {
    return stringify(txsHistory);
  }
  static unserializeTxsHistory(txsHistory: string): TxsHistory {
    return parse(txsHistory);
  }

  /**
   * Add txs history of a specific network
   * @param txsHistory
   * @param network
   */
  async addTxsHistory(txsHistory: TxsHistory, network: Network['value']): Promise<void> {
    try {
      if (!network) {
        throw new Error('Network is required');
      }
      const currentTxsHistoryByNetwork = await this.getTxsHistoryByNetwork();
      let newLiquidTxsHistory = currentTxsHistoryByNetwork.liquid ?? {};
      let newRegtestTxsHistory = currentTxsHistoryByNetwork.regtest ?? {};
      if (network === 'liquid') {
        newLiquidTxsHistory = { ...currentTxsHistoryByNetwork.liquid, ...txsHistory };
      } else {
        newRegtestTxsHistory = { ...currentTxsHistoryByNetwork.regtest, ...txsHistory };
      }
      //const txs = BrowserStorageTxsHistoryRepo.serializeTxsHistory({liquid:newLiquidTxsHistory, regtest: newRegtestTxsHistory})
      await browser.storage.local.set({
        txsHistory: {
          regtest: BrowserStorageTxsHistoryRepo.serializeTxsHistory(newRegtestTxsHistory),
          liquid: BrowserStorageTxsHistoryRepo.serializeTxsHistory(newLiquidTxsHistory),
        },
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get txs history of all networks
   */
  async getTxsHistoryByNetwork(): Promise<TxsHistoryByNetwork> {
    try {
      const { txsHistory } = await browser.storage.local.get('txsHistory');
      // Only check that txsHistory is not undefined but can be empty
      if (!txsHistory) {
        throw new Error('transaction history not found');
      }
      return {
        liquid: BrowserStorageTxsHistoryRepo.unserializeTxsHistory(txsHistory.liquid),
        regtest: BrowserStorageTxsHistoryRepo.unserializeTxsHistory(txsHistory.regtest),
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * Initialize state with txs history of all networks
   * @param txsHistoryByNetwork
   */
  async init(txsHistoryByNetwork: TxsHistoryByNetwork): Promise<void> {
    try {
      await browser.storage.local.set({
        txsHistory: {
          liquid: BrowserStorageTxsHistoryRepo.serializeTxsHistory(txsHistoryByNetwork.liquid),
          regtest: BrowserStorageTxsHistoryRepo.serializeTxsHistory(txsHistoryByNetwork.regtest),
        },
      });
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * Udpate txs history of all networks
   * @param cb
   */
  async updateTxsHistoryByNetwork(
    cb: (txsHistoryByNetwork: TxsHistoryByNetwork) => TxsHistoryByNetwork
  ): Promise<void> {
    try {
      const txsHistoryByNetwork = await this.getTxsHistoryByNetwork();
      const updatedTxsHistoryByNetwork = cb(txsHistoryByNetwork);
      await browser.storage.local.set({
        txsHistory: {
          liquid: BrowserStorageTxsHistoryRepo.serializeTxsHistory(
            updatedTxsHistoryByNetwork.liquid
          ),
          regtest: BrowserStorageTxsHistoryRepo.serializeTxsHistory(
            updatedTxsHistoryByNetwork.regtest
          ),
        },
      });
    } catch (error) {
      throw new Error(error);
    }
  }
}
