import { AssetHash, Transaction } from "liquidjs-lib";
import zkp from '@vulpemventures/secp256k1-zkp'
import Browser from "webextension-polyfill";
import { ListUnspentResponse } from "../domain/chainsource";
import { Unblinder, WalletRepositoryUnblinder } from "../domain/unblinder";
import { TxDetails, UnblindingData } from "../domain/transaction";
import { WalletRepository, AppRepository, AssetRepository } from "../infrastructure/repository";
import { TxIDsKey, ScriptUnspentsKey, TxDetailsKey } from "../infrastructure/storage/wallet-repository";

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
    private listener: ((changes: Record<string, Browser.Storage.StorageChange>) => Promise<void>) | undefined;

    constructor(private walletRepository: WalletRepository, private appRepository: AppRepository, private assetRepository: AssetRepository) {
        this.unblinder = new WalletRepositoryUnblinder(walletRepository, appRepository, assetRepository, zkpLib);
    }

    // set up the onChanged chrome storage listener
    async start() {
        if (this.listener) await this.stop();
        this.listener = this.onChangesListener();
        Browser.storage.onChanged.addListener(this.listener);
    }

    // remove the onChanged chrome storage listener
    async stop() {
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
                        const oldTxIDs = changes[key].oldValue ? changes[key].oldValue as string[] : [];

                        // for all new txs, we need to fetch the tx hex
                        const oldTxIDsSet = new Set(oldTxIDs);
                        const txIDsToFetch = newTxIDs.filter(txID => !oldTxIDsSet.has(txID));
                        try {
                            const chainSource = await this.appRepository.getChainSource(network);
                            if (!chainSource) {
                                console.error('Chain source not found', network);
                                continue;
                            }
                            const transactions = await chainSource.fetchTransactions(txIDsToFetch);
                            await this.walletRepository.updateTxDetails(Object.fromEntries(transactions.map((tx, i) => [txIDsToFetch[i], tx])));
                        } catch (e) {
                            console.error(e);
                        }
                    } else if (ScriptUnspentsKey.is(key)) {
                        const [script] = ScriptUnspentsKey.decode(key);
                        const newUnspents = changes[key].newValue as ListUnspentResponse | undefined;
                        if (!newUnspents) continue; // it means we just deleted the key
                        const oldUnspents = changes[key].oldValue ? changes[key].oldValue as ListUnspentResponse : [];

                        // for all new unspents, we need to fetch the tx hex
                        const oldUnspentsSet = new Set(oldUnspents);
                        const utxosToUnblind = newUnspents.filter(unspent => !oldUnspentsSet.has(unspent));

                        // get the tx hexes in order to unblind their Output
                        const txIDs = utxosToUnblind.map(unspent => unspent.tx_hash);
                        const fromCache = await this.walletRepository.getTxDetails(...txIDs);

                        const txMapToHex = new Map<string, string>();
                        const missingTxs = [];

                        for (const [ID, details] of Object.entries(fromCache)) {
                            if (details?.hex) txMapToHex.set(ID, details.hex);
                            else missingTxs.push(ID);
                        }

                        const { [script]: details } = await this.walletRepository.getScriptDetails(script);
                        if (!details || !details.network) {
                            console.error('Script details not found', script);
                            continue;
                        }

                        // if not found in cache, fetch them from the chain source
                        if (missingTxs.length > 0) {
                            const chainSource = await this.appRepository.getChainSource(details.network);
                            if (!chainSource) {
                                console.error('Chain source not found', details.network);
                                continue;
                            }
                            const txs = await chainSource.fetchTransactions(missingTxs);
                            for (const tx of txs) {
                                txMapToHex.set(tx.txID, tx.hex);
                            }
                        }

                        const outputs = utxosToUnblind.map(unspent => {
                            const txHex = txMapToHex.get(unspent.tx_hash);
                            if (!txHex) throw new Error('Tx hex not found');
                            const tx = Transaction.fromHex(txHex);
                            return tx.outs[unspent.tx_pos];
                        });

                        const unblindedResults = await this.unblinder.unblind(...outputs);
                        const errors = unblindedResults.filter(u => u instanceof Error) as Error[];
                        const successfullyUnblinded = unblindedResults.filter(u => !(u instanceof Error)) as UnblindingData[];

                        await this.walletRepository.updateOutpointBlindingData(successfullyUnblinded.map((unblinded, i) => {
                            return [{ txID: utxosToUnblind[i].tx_hash, vout: utxosToUnblind[i].tx_pos }, unblinded];
                        }))

                        if (errors.length > 0) {
                            console.error('Errors while unblinding', errors);
                        }

                        
                    } else if (TxDetailsKey.is(key) && changes[key].newValue?.hex) {
                        if (changes[key].oldValue && changes[key].oldValue.hex) continue;
                        const [txID] = TxDetailsKey.decode(key);
                        const newTxDetails = changes[key].newValue as TxDetails | undefined;
                        if (!newTxDetails || !newTxDetails.hex) continue; // it means we just deleted the key
                        const tx = Transaction.fromHex(newTxDetails.hex);
                        const unblindedResults = await this.unblinder.unblind(...tx.outs)
                        const updateArray: Array<[{ txID: string; vout: number }, UnblindingData]> = []
                        for (const [vout, unblinded] of unblindedResults.entries()) {
                            if (unblinded instanceof Error) continue;
                            updateArray.push([{ txID, vout }, unblinded]);
                        }
                        await this.walletRepository.updateOutpointBlindingData(updateArray);
                    }
                } catch (e) {
                    continue;
                }
            }
        }






    }
}