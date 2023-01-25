import type { NetworkString } from 'marina-provider';
import Browser from 'webextension-polyfill';
import type { MaybeNull } from './common';

// @ts-ignore
import coinselect from 'coinselect';
import type { TxOutput } from 'liquidjs-lib';
import { Transaction } from 'liquidjs-lib';
import type { AccountDetails, ScriptDetails } from '../../domain/account-type';
import type { ListUnspentResponse } from '../../domain/chainsource';
import type {
  TxDetails,
  UnblindingData,
  UnblindedOutput,
  CoinSelection,
} from '../../domain/transaction';
import type { WalletRepository } from '../repository';
import { DynamicStorageKey } from './dynamic-key';

type LockedOutpoint = {
  txID: string;
  vout: number;
  until: number; // timestamp in milliseconds, after which the outpoint should be unlocked
};

export enum WalletStorageKey {
  INTERNAL_INDEX = 'internalIndex',
  EXTERNAL_INDEX = 'externalIndex',
  ENCRYPTED_MNEMONIC = 'encryptedMnemonic',
  PASSWORD_HASH = 'passwordHash',
  MASTER_BLINDING_KEY = 'masterBlindingKey',
  LOCKED_OUTPOINTS = 'lockedOutpoints',
}
// dynamic keys
export const TxDetailsKey = new DynamicStorageKey<[txid: string]>('txdetails');
export const ScriptUnspentsKey = new DynamicStorageKey<[script: string]>('unspents');
export const ScriptDetailsKey = new DynamicStorageKey<[script: string]>('details');
export const OutpointBlindingDataKey = new DynamicStorageKey<[txid: string, vout: number]>(
  'blindingdata'
);
export const AccountKey = new DynamicStorageKey<[name: string]>('account');
export const TxIDsKey = new DynamicStorageKey<[network: NetworkString]>('txids');

export class WalletStorageAPI implements WalletRepository {
  async addTransactions(network: NetworkString, ...txIDs: string[]): Promise<void> {
    const transactions = await this.getTransactions(network);
    const newTransactions = [...new Set([...transactions, ...txIDs])];
    return Browser.storage.local.set({ [TxIDsKey.make(network)]: newTransactions });
  }

  async getAccountDetails(...names: string[]): Promise<Record<string, AccountDetails>> {
    if (names.length === 0) {
      names = await this.getAllAccountsNames();
    }
    const keys = names.map((n) => AccountKey.make(n));
    const details = await Browser.storage.local.get(keys);
    return Object.fromEntries(
      Object.entries(details).map(([key, details]) => [AccountKey.decode(key)[0], details])
    ) as Record<string, AccountDetails>;
  }

  async updateAccountDetails(name: string, details: Partial<AccountDetails>): Promise<void> {
    const key = AccountKey.make(name);
    const currentDetails = (await this.getAccountDetails(name))[name];
    return Browser.storage.local.set({ [key]: { ...currentDetails, ...details } });
  }

  async updateAccountLastUsedIndexes(
    name: string,
    network: NetworkString,
    indexes: Partial<{ internal: number; external: number }>
  ): Promise<void> {
    const key = AccountKey.make(name);
    const currentDetails = (await this.getAccountDetails(name))[name];
    const currentLastUsedIndexes = currentDetails.lastUsedIndexes?.[network] ?? {};
    return Browser.storage.local.set({
      [key]: {
        ...currentDetails,
        lastUsedIndexes: {
          ...currentDetails.lastUsedIndexes,
          [network]: {
            ...currentLastUsedIndexes,
            ...indexes,
          },
        },
      },
    });
  }

  setLastUsedIndex(index: number, isInternal: boolean): Promise<void> {
    const key = isInternal ? WalletStorageKey.INTERNAL_INDEX : WalletStorageKey.EXTERNAL_INDEX;
    return Browser.storage.local.set({ [key]: index });
  }

  async getTransactions(...network: NetworkString[]): Promise<string[]> {
    const keys = network.map((n) => TxIDsKey.make(n));
    const values = await Browser.storage.local.get(keys);
    return Object.values(values).flat() as Array<string>;
  }

  async getLastUsedIndexes(): MaybeNull<{ internal?: number; external?: number }> {
    const indexes = await Browser.storage.local.get([
      WalletStorageKey.INTERNAL_INDEX,
      WalletStorageKey.EXTERNAL_INDEX,
    ]);
    return {
      internal: (indexes[WalletStorageKey.INTERNAL_INDEX] as number) ?? undefined,
      external: (indexes[WalletStorageKey.EXTERNAL_INDEX] as number) ?? undefined,
    };
  }

  async getScriptDetails(...scripts: string[]): Promise<Record<string, ScriptDetails>> {
    const keys = scripts.map((s) => ScriptDetailsKey.make(s));
    const details = await Browser.storage.local.get(keys);
    return Object.fromEntries(
      Object.entries(details)
        .filter(([_, value]) => value !== null)
        .map(([key, value]) => [ScriptDetailsKey.decode(key)[0], value])
    ) as Record<string, ScriptDetails>;
  }

  async getTxDetails(...txIDs: string[]): Promise<Record<string, TxDetails>> {
    const keys = txIDs.map((t) => TxDetailsKey.make(t));
    const details = await Browser.storage.local.get(keys);
    return Object.fromEntries(
      Object.entries(details)
        .filter(([_, value]) => value !== null)
        .map(([key, value]) => [TxDetailsKey.decode(key)[0], value])
    ) as Record<string, TxDetails>;
  }

  async addWalletTransactions(network: NetworkString, ...txIDs: string[]): Promise<void> {
    const key = TxIDsKey.make(network);
    const data = await Browser.storage.local.get([key]);
    const txids = new Set((data[key] as Array<string>) ?? []);
    for (const txid of txIDs) {
      txids.add(txid);
    }
    return Browser.storage.local.set({ [key]: Array.from(txids) });
  }

  async updateTxDetails(txIDtoDetails: Record<string, TxDetails>): Promise<void> {
    const keys = Object.keys(txIDtoDetails).map((id) => TxDetailsKey.make(id));
    const detailsInStorage = await Browser.storage.local.get(keys);

    return Browser.storage.local.set(
      Object.fromEntries(
        Object.entries(txIDtoDetails).map(([txid, details]) => [
          TxDetailsKey.make(txid),
          { ...detailsInStorage[TxDetailsKey.make(txid)], ...details },
        ])
      )
    );
  }

  async updateScriptDetails(scriptToDetails: Record<string, ScriptDetails>): Promise<void> {
    return Browser.storage.local.set(
      Object.fromEntries(
        Object.entries(scriptToDetails).map(([script, details]) => [
          ScriptDetailsKey.make(script),
          details,
        ])
      )
    );
  }

  updateScriptUnspents(scriptToUnspents: Record<string, ListUnspentResponse>): Promise<void> {
    return Browser.storage.local.set(
      Object.fromEntries(
        Object.entries(scriptToUnspents).map(([script, unspents]) => [
          ScriptUnspentsKey.make(script),
          unspents,
        ])
      )
    );
  }

  updateOutpointBlindingData(
    outpointToBlindingData: Array<[{ txID: string; vout: number }, UnblindingData]>
  ): Promise<void> {
    return Browser.storage.local.set(
      Object.fromEntries(
        outpointToBlindingData.map(([outpoint, blindingData]) => [
          OutpointBlindingDataKey.make(outpoint.txID, outpoint.vout),
          blindingData,
        ])
      )
    );
  }

  async getOutputBlindingData(
    txID: string,
    vout: number
  ): Promise<{ txID: string; vout: number; blindingData?: UnblindingData }> {
    const keys = [OutpointBlindingDataKey.make(txID, vout)];
    const { [keys[0]]: blindingData } = await Browser.storage.local.get(keys);
    return { txID, vout, blindingData: (blindingData as UnblindingData) ?? undefined };
  }

  async getUtxos(network: NetworkString, ...accountNames: string[]): Promise<UnblindedOutput[]> {
    let scripts = await this.getScripts(network);

    if (accountNames.length > 0) {
      // if accountNames is set, we need to filter the scripts
      const scriptDetails = await this.getScriptDetails(...scripts);
      scripts = scripts.filter(
        (script) =>
          scriptDetails[script] && accountNames.includes(scriptDetails[script].accountName)
      );
    }

    const keys = scripts.map((s) => ScriptUnspentsKey.make(s));
    const scriptToUnspent: Record<string, ListUnspentResponse> = await Browser.storage.local.get(
      keys
    );
    const outpoints = Object.values(scriptToUnspent).flat();
    const outpointsKeys = outpoints.map((outpoint) =>
      OutpointBlindingDataKey.make(outpoint.tx_hash, outpoint.tx_pos)
    );
    const outpointsToBlindingData: Record<string, UnblindingData> = await Browser.storage.local.get(
      outpointsKeys
    );
    const allUtxos = outpoints.map((outpoint) => ({
      txID: outpoint.tx_hash,
      vout: outpoint.tx_pos,
      blindingData:
        outpointsToBlindingData[OutpointBlindingDataKey.make(outpoint.tx_hash, outpoint.tx_pos)],
    }));

    const lockedOutpoints = await this.getLockedOutpoints();
    return allUtxos.filter(
      (utxo) => !lockedOutpoints.includes({ txID: utxo.txID, vout: utxo.vout })
    );
  }

  async selectUtxos(
    network: NetworkString,
    targets: { amount: number; asset: string }[],
    lock = false,
    ...acountNames: string[]
  ): Promise<CoinSelection> {
    const allUtxos = await this.getUtxos(network, ...acountNames);
    const onlyWithUnblindingData = allUtxos.filter((utxo) => utxo.blindingData);
    // accumulate targets with same asset
    targets = targets.reduce((acc, target) => {
      const existingTarget = acc.find((t) => t.asset === target.asset);
      if (existingTarget) {
        existingTarget.amount += target.amount;
      } else {
        acc.push(target);
      }
      return acc;
    }, [] as { amount: number; asset: string }[]);

    const selectedUtxos: UnblindedOutput[] = [];
    const changeOutputs: { asset: string; amount: number }[] = [];
    for (const target of targets) {
      const utxos = onlyWithUnblindingData.filter(
        (utxo) => utxo.blindingData?.asset === target.asset
      );
      const { inputs, outputs } = coinselect(
        utxos.map((utxo) => ({
          txId: utxo.txID,
          vout: utxo.vout,
          value: utxo.blindingData?.value,
        })),
        [{ address: 'fake', value: target.amount }],
        0
      );

      if (inputs) {
        selectedUtxos.push(
          ...(inputs as { txId: string; vout: number }[]).map(
            (input) =>
              onlyWithUnblindingData.find(
                (utxo) => utxo.txID === input.txId && utxo.vout === input.vout
              ) as UnblindedOutput
          )
        );
      }

      console.log('outputs', outputs);
      if (outputs) {
        changeOutputs.push(...outputs
          .filter((output: any) => output.address === undefined) // only add change outputs
          .map((output: { value: number; }) => ({
            asset: target.asset,
            amount: output.value,
          })));
      }
    }

    if (lock) {
      await this.lockOutpoints(selectedUtxos);
    }

    return {
      utxos: selectedUtxos,
      changeOutputs,
    };
  }

  async getWitnessUtxo(txID: string, vout: number): Promise<TxOutput | undefined> {
    const txKey = TxDetailsKey.make(txID);
    const { [txKey]: txDetails } = await Browser.storage.local.get(txKey);
    if (!txDetails || !txDetails.hex) return undefined;
    return Transaction.fromHex(txDetails.hex).outs[vout];
  }

  async getEncryptedMnemonic(): Promise<string | undefined> {
    const { [WalletStorageKey.ENCRYPTED_MNEMONIC]: value } = await Browser.storage.local.get(
      WalletStorageKey.ENCRYPTED_MNEMONIC
    );
    return value ? value : undefined;
  }

  async getPasswordHash(): Promise<string | undefined> {
    const { [WalletStorageKey.PASSWORD_HASH]: value } = await Browser.storage.local.get(
      WalletStorageKey.PASSWORD_HASH
    );
    return value ? value : undefined;
  }

  async getMasterBlindingKey(): Promise<string | undefined> {
    const { [WalletStorageKey.MASTER_BLINDING_KEY]: value } = await Browser.storage.local.get(
      WalletStorageKey.MASTER_BLINDING_KEY
    );
    return value ? value : undefined;
  }

  async setSeedData(
    encryptedMnemonic: string,
    passwordHash: string,
    masterBlindingKey: string
  ): Promise<void> {
    return Browser.storage.local.set({
      [WalletStorageKey.ENCRYPTED_MNEMONIC]: encryptedMnemonic,
      [WalletStorageKey.PASSWORD_HASH]: passwordHash,
      [WalletStorageKey.MASTER_BLINDING_KEY]: masterBlindingKey,
    });
  }

  onNewTransaction(callback: (txID: string, tx: TxDetails) => Promise<void>) {
    return Browser.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local') return;
      const txKeys = Object.entries(changes)
        .filter(([key, changes]) => TxDetailsKey.is(key) && changes.newValue !== undefined)
        .map(([key]) => key);

      for (const txKey of txKeys) {
        const [txID] = TxDetailsKey.decode(txKey);
        const details = changes[txKey].newValue as TxDetails;
        await callback(txID, details);
      }
    });
  }

  onNewUtxo(callback: (utxo: UnblindedOutput) => Promise<void>) {
    return Browser.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local') return;
      const listUnspentKeys = Object.entries(changes).filter(
        ([key, changes]) => ScriptUnspentsKey.is(key) && changes.newValue !== undefined
      );

      for (const [, change] of listUnspentKeys) {
        // check if there is NEW utxo
        const newUnspents = change.newValue as ListUnspentResponse | undefined;
        if (!newUnspents) continue; // it means we just deleted the key
        const oldUnspents = change.oldValue ? (change.oldValue as ListUnspentResponse) : [];

        const oldUnspentsSet = new Set(oldUnspents);
        const newUnspentsAdded = newUnspents.filter((unspent) => !oldUnspentsSet.has(unspent));
        for (const newUtxo of newUnspentsAdded) {
          const utxo = await this.getOutputBlindingData(newUtxo.tx_hash, newUtxo.tx_pos);
          await callback(utxo);
        }
      }
    });
  }

  onDeleteUtxo(callback: (utxo: UnblindedOutput) => Promise<void>): void {
    return Browser.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local') return;
      const listUnspentKeys = Object.entries(changes).filter(
        ([key, changes]) => ScriptUnspentsKey.is(key) && changes.newValue !== undefined
      );

      for (const [, change] of listUnspentKeys) {
        // check if there is NEW utxo
        const newUnspents = change.newValue as ListUnspentResponse | undefined;
        if (!newUnspents) continue; // it means we just deleted the key
        const oldUnspents = change.oldValue ? (change.oldValue as ListUnspentResponse) : [];

        const newUnspentsSet = new Set(newUnspents);
        const oldUnspentsDeleted = oldUnspents.filter((unspent) => !newUnspentsSet.has(unspent));
        for (const oldUtxo of oldUnspentsDeleted) {
          const utxo = await this.getOutputBlindingData(oldUtxo.tx_hash, oldUtxo.tx_pos);
          await callback(utxo);
        }
      }
    });
  }

  private async getScripts(...networks: NetworkString[]): Promise<Array<string>> {
    // get all scripts key in storage
    const wholeStorage = await Browser.storage.local.get(null);
    return Object.entries(wholeStorage)
      .filter(
        ([key, value]) =>
          ScriptDetailsKey.is(key) && networks.includes((value as ScriptDetails).network)
      )
      .map(([key]) => ScriptDetailsKey.decode(key)[0]);
  }

  private async getAllAccountsNames(): Promise<Array<string>> {
    const wholeStorage = await Browser.storage.local.get(null);
    return Object.entries(wholeStorage)
      .filter(([key, value]) => AccountKey.is(key) && value !== null)
      .map(([key]) => AccountKey.decode(key)[0]);
  }

  static LOCKTIME = 5 * 60 * 1000; // 5 minutes

  private async lockOutpoints(outpoints: Array<{ txID: string; vout: number }>): Promise<void> {
    const { [WalletStorageKey.LOCKED_OUTPOINTS]: lockedOutpoints } =
      await Browser.storage.local.get(WalletStorageKey.LOCKED_OUTPOINTS);
    const current = lockedOutpoints ?? [];
    const until = Date.now() + WalletStorageAPI.LOCKTIME;
    for (const outpoint of outpoints) {
      if (
        current.findIndex((o: any) => o.txID === outpoint.txID && o.vout === outpoint.vout) === -1
      ) {
        current.push({ txID: outpoint.txID, vout: outpoint.vout, until });
      }
    }
    return Browser.storage.local.set({ [WalletStorageKey.LOCKED_OUTPOINTS]: current });
  }

  // unlock all outpoints that are locked for more than WalletStorageAPI.LOCKTIME milliseconds
  private async unlockOutpoints(): Promise<void> {
    const { [WalletStorageKey.LOCKED_OUTPOINTS]: lockedOutpoints } =
      await Browser.storage.local.get(WalletStorageKey.LOCKED_OUTPOINTS);
    const set = new Set<LockedOutpoint>(lockedOutpoints ?? []);
    const now = Date.now();
    for (const outpoint of set) {
      if (outpoint.until <= now) {
        set.delete(outpoint);
      }
    }
    return Browser.storage.local.set({ [WalletStorageKey.LOCKED_OUTPOINTS]: Array.from(set) });
  }

  private async getLockedOutpoints(): Promise<Array<{ txID: string; vout: number }>> {
    try {
      await this.unlockOutpoints();
    } catch (e) {
      /* ignore */
    }
    const { [WalletStorageKey.LOCKED_OUTPOINTS]: lockedOutpoints } =
      await Browser.storage.local.get(WalletStorageKey.LOCKED_OUTPOINTS);
    return (lockedOutpoints ?? []).map((outpoint: LockedOutpoint) => ({
      txID: outpoint.txID,
      vout: outpoint.vout,
    }));
  }
}
