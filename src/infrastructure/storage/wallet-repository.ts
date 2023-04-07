// @ts-ignore
import coinselect from 'coinselect';
// import coinselectSplit from 'coinselect/split';
import type { AccountID, NetworkString, ScriptDetails } from 'marina-provider';
import Browser from 'webextension-polyfill';
import type { TxOutput } from 'liquidjs-lib';
import { Transaction } from 'liquidjs-lib';
import type {
  TxDetails,
  UnblindingData,
  UnblindedOutput,
  CoinSelection,
} from '../../domain/transaction';
import { computeBalances } from '../../domain/transaction';
import type { AccountDetails, WalletRepository, Outpoint } from '../../domain/repository';
import { DynamicStorageKey } from './dynamic-key';
import type { Encrypted } from '../../domain/encryption';
import { CoinSelectionError } from '../../domain/errors';
import { MainAccountLegacy, MainAccount, MainAccountTest } from '../../application/account';

type LockedOutpoint = Outpoint & {
  until: number; // timestamp in milliseconds, after which the outpoint should be unlocked
};

export enum WalletStorageKey {
  INTERNAL_INDEX = 'internalIndex',
  EXTERNAL_INDEX = 'externalIndex',
  ENCRYPTED_MNEMONIC = 'encryptedMnemonic',
  MASTER_BLINDING_KEY = 'masterBlindingKey',
  LOCKED_OUTPOINTS = 'lockedOutpoints',
}
// dynamic keys
export const TxDetailsKey = new DynamicStorageKey<[txid: string]>('txdetails');
// export const ScriptUnspentsKey = new DynamicStorageKey<[script: string]>('unspents');
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

  async updateAccountKeyIndex(
    name: string,
    network: NetworkString,
    indexes: Partial<{ internal: number; external: number }>
  ): Promise<void> {
    const key = AccountKey.make(name);
    const currentDetails = (await this.getAccountDetails(name))[name];
    const currentIndexes = currentDetails.nextKeyIndexes?.[network] ?? {};
    return Browser.storage.local.set({
      [key]: {
        ...currentDetails,
        nextKeyIndexes: {
          ...currentDetails.nextKeyIndexes,
          [network]: {
            ...currentIndexes,
            ...indexes,
          },
        },
      } as AccountDetails,
    });
  }

  async getTransactions(...network: NetworkString[]): Promise<string[]> {
    const keys = network.map((n) => TxIDsKey.make(n));
    const values = await Browser.storage.local.get(keys);
    return Object.values(values).flat() as Array<string>;
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
    const currentDetails = await this.getScriptDetails(...Object.keys(scriptToDetails));

    return Browser.storage.local.set(
      Object.fromEntries(
        Object.entries(scriptToDetails).map(([script, details]) => [
          ScriptDetailsKey.make(script),
          {
            ...details,
            networks: [
              ...new Set([...(currentDetails[script]?.networks ?? []), ...details.networks]),
            ],
          },
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

  async getOutputBlindingData(...outpoints: Outpoint[]): Promise<UnblindedOutput[]> {
    const keys = outpoints.map((o) => OutpointBlindingDataKey.make(o.txID, o.vout));
    const values = await Browser.storage.local.get(keys);
    return outpoints.map(({ txID, vout }) => {
      const key = OutpointBlindingDataKey.make(txID, vout);
      const blindingData = values[key] as UnblindingData | undefined;
      return { txID, vout, blindingData };
    });
  }

  private async getUtxosFromTransactions(
    walletScripts: Buffer[],
    ...networks: NetworkString[]
  ): Promise<UnblindedOutput[]> {
    const transactionsIDs = await this.getTransactions(...networks);
    const txDetails = await this.getTxDetails(...transactionsIDs);

    const outpointsInInputs = new Set<string>();
    const walletOutputs = new Set<string>();

    const transactions = Object.values(txDetails)
      .filter((tx) => tx?.hex)
      .map((tx) => Transaction.fromHex(tx.hex!));
    for (const tx of transactions) {
      for (const input of tx.ins) {
        outpointsInInputs.add(
          `${Buffer.from(input.hash).reverse().toString('hex')}:${input.index}`
        );
      }
      for (let i = 0; i < tx.outs.length; i++) {
        if (!walletScripts.find((script) => script.equals(tx.outs[i].script))) continue;
        walletOutputs.add(`${tx.getId()}:${i}`);
      }
    }

    const utxosOutpoints = Array.from(walletOutputs)
      .filter((outpoint) => !outpointsInInputs.has(outpoint))
      .map((outpoint) => {
        const [txid, vout] = outpoint.split(':');
        return { txID: txid, vout: Number(vout) };
      });

    const utxos = await this.getOutputBlindingData(...utxosOutpoints);
    return utxos;
  }

  async getUtxos(network: NetworkString, ...accountNames: string[]): Promise<UnblindedOutput[]> {
    let scripts = await this.getScripts(network);

    if (accountNames.length > 0) {
      const scriptDetails = await this.getScriptDetails(...scripts);
      scripts = scripts.filter((script) =>
        accountNames.includes(scriptDetails[script].accountName)
      );
    }
    return this.getUtxosFromTransactions(
      scripts.map((s) => Buffer.from(s, 'hex')),
      network
    );
  }

  async getUnlockedUtxos(
    network: NetworkString,
    ...accountNames: string[]
  ): Promise<UnblindedOutput[]> {
    const allUtxos = await this.getUtxos(network, ...accountNames);
    const lockedOutpoints = await this.getLockedOutpoints();
    return allUtxos.filter((utxo) => !lockedOutpoints.has(`${utxo.txID}:${utxo.vout}`));
  }

  // throws CoinSelectionError
  async selectUtxos(
    network: NetworkString,
    targets: { amount: number; asset: string }[],
    excludeOutpoints: Outpoint[] = [],
    ...acountNames: string[]
  ): Promise<CoinSelection> {
    const utxos = (await this.getUnlockedUtxos(network, ...acountNames)).filter(
      (utxo) =>
        utxo.blindingData &&
        !excludeOutpoints.find(({ txID, vout }) => utxo.txID === txID && utxo.vout === vout)
    );
    const balances = computeBalances(utxos);
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
      const utxosFilteredByAsset = utxos.filter(
        (utxo) => utxo.blindingData?.asset === target.asset
      );
      const isSendAll = target.amount === balances[target.asset];
      const { inputs, outputs } = coinselect(
        utxosFilteredByAsset.map((utxo) => ({
          txId: utxo.txID,
          vout: utxo.vout,
          value: utxo.blindingData?.value ?? 0,
        })),
        [{ address: 'fake', value: isSendAll ? undefined : target.amount }],
        0
      );

      if (inputs) {
        selectedUtxos.push(
          ...(inputs as { txId: string; vout: number }[]).map(
            (input) =>
              utxos.find(
                (utxo) => utxo.txID === input.txId && utxo.vout === input.vout
              ) as UnblindedOutput
          )
        );
      }

      if (outputs) {
        changeOutputs.push(
          ...outputs
            .filter((output: any) => output.address === undefined) // only add change outputs
            .map((output: { value: number }) => ({
              asset: target.asset,
              amount: output.value,
            }))
        );
      }
    }

    // check if we have enough utxos for each target
    // throw CoinSelectionError if not
    for (const { amount, asset } of targets) {
      const selectedAmount = selectedUtxos.reduce(
        (acc, utxo) =>
          utxo.blindingData?.asset === asset ? acc + utxo.blindingData?.value ?? 0 : acc,
        0
      );
      if (selectedAmount < amount) {
        throw new CoinSelectionError({ amount, asset }, selectedAmount);
      }
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

  async getEncryptedMnemonic(): Promise<Encrypted | undefined> {
    const { [WalletStorageKey.ENCRYPTED_MNEMONIC]: value } = await Browser.storage.local.get(
      WalletStorageKey.ENCRYPTED_MNEMONIC
    );
    return value ? (value as Encrypted) : undefined;
  }

  async getMasterBlindingKey(): Promise<string | undefined> {
    const { [WalletStorageKey.MASTER_BLINDING_KEY]: value } = await Browser.storage.local.get(
      WalletStorageKey.MASTER_BLINDING_KEY
    );
    return value ? value : undefined;
  }

  async setSeedData(encryptedMnemonic: Encrypted, masterBlindingKey: string): Promise<void> {
    return Browser.storage.local.set({
      [WalletStorageKey.ENCRYPTED_MNEMONIC]: encryptedMnemonic,
      [WalletStorageKey.MASTER_BLINDING_KEY]: masterBlindingKey,
    });
  }

  async lockOutpoints(outpoints: Outpoint[]): Promise<void> {
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

  onNewTransaction(
    callback: (txID: string, tx: TxDetails, network: NetworkString) => Promise<void>
  ) {
    const listener = async (
      changes: Record<string, Browser.Storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      const txKeys = Object.entries(changes)
        .filter(
          ([key, changes]) =>
            TxDetailsKey.is(key) &&
            changes.newValue !== undefined &&
            changes.newValue.hex !== undefined &&
            changes.oldValue?.hex === undefined
        )
        .map(([key]) => key);

      const txIDsByNetwork = {
        liquid: await this.getTransactions('liquid'),
        testnet: await this.getTransactions('testnet'),
        regtest: await this.getTransactions('regtest'),
      };

      for (const txKey of txKeys) {
        const [txID] = TxDetailsKey.decode(txKey);
        const details = changes[txKey].newValue as TxDetails;
        let network = undefined;
        for (const net of Object.keys(txIDsByNetwork) as NetworkString[]) {
          if (txIDsByNetwork[net].includes(txID)) {
            network = net;
            break;
          }
        }

        await callback(txID, details, network || 'liquid');
      }
    };
    Browser.storage.onChanged.addListener(listener);
    return () => Browser.storage.onChanged.removeListener(listener);
  }

  onNewUtxo(network: NetworkString) {
    return (callback: (utxo: UnblindedOutput) => Promise<void>) => {
      return this.onNewTransaction(async (txID: string) => {
        const newUtxosState = await this.getUtxos(network);
        const utxosFromNewTx = newUtxosState.filter((utxo) => utxo.txID === txID);
        for (const utxo of utxosFromNewTx) {
          await callback(utxo);
        }
      });
    };
  }

  onDeleteUtxo(network: NetworkString) {
    return (callback: (utxo: UnblindedOutput) => Promise<void>) => {
      let utxosPromise = this.getUtxos(network);

      return this.onNewTransaction(async () => {
        const oldUtxos = await utxosPromise;
        const newUtxosState = await this.getUtxos(network);
        const deletedUtxos = oldUtxos.filter(
          (utxo) => !newUtxosState.find((u) => u.txID === utxo.txID && u.vout === utxo.vout)
        );
        utxosPromise = Promise.resolve(newUtxosState);
        for (const utxo of deletedUtxos) {
          await callback(utxo);
        }
      });
    };
  }

  onNewScript(callback: (script: string, details: ScriptDetails) => Promise<void>) {
    const listener = async (
      changes: Record<string, Browser.Storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      const scriptKeys = Object.entries(changes)
        .filter(([key, changes]) => ScriptDetailsKey.is(key) && changes.newValue !== undefined)
        .map(([key]) => key);

      for (const scriptKey of scriptKeys) {
        const [script] = ScriptDetailsKey.decode(scriptKey);
        const details = changes[scriptKey].newValue as ScriptDetails;
        await callback(script, details);
      }
    };
    Browser.storage.onChanged.addListener(listener);
    return () => Browser.storage.onChanged.removeListener(listener);
  }

  onUnblindingEvent(callback: (event: UnblindedOutput) => Promise<void>) {
    const listener = async (
      changes: Record<string, Browser.Storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      const unblindingKeys = Object.entries(changes)
        .filter(
          ([key, changes]) =>
            OutpointBlindingDataKey.is(key) &&
            changes.newValue !== undefined &&
            changes.oldValue === undefined
        )
        .map(([key]) => key);

      for (const unblindingKey of unblindingKeys) {
        const [txID, vout] = OutpointBlindingDataKey.decode(unblindingKey);
        const data = changes[unblindingKey].newValue as UnblindingData;
        await callback({ txID, vout, ...data });
      }
    };
    Browser.storage.onChanged.addListener(listener);
    return () => Browser.storage.onChanged.removeListener(listener);
  }

  async getAccountScripts(
    network: NetworkString,
    ...names: string[]
  ): Promise<Record<string, ScriptDetails>> {
    if (!names || names.length === 0) names = getMainAccountsIDs(network);
    const wholeStorage = await Browser.storage.local.get(null);
    return Object.fromEntries(
      Object.entries(wholeStorage)
        .filter(
          ([key, value]) =>
            ScriptDetailsKey.is(key) &&
            names.includes((value as ScriptDetails).accountName) &&
            (value as ScriptDetails).networks.includes(network)
        )
        .map(([key, value]) => [ScriptDetailsKey.decode(key)[0], value as ScriptDetails])
    );
  }

  private async getScripts(...networks: NetworkString[]): Promise<Array<string>> {
    // get all scripts key in storage
    const wholeStorage = await Browser.storage.local.get(null);
    return Object.entries(wholeStorage)
      .filter(
        ([key, value]) =>
          ScriptDetailsKey.is(key) &&
          (value as ScriptDetails).networks.some((network) => networks.includes(network))
      )
      .map(([key]) => ScriptDetailsKey.decode(key)[0]);
  }

  private async getAllAccountsNames(): Promise<Array<string>> {
    const wholeStorage = await Browser.storage.local.get(null);
    return Object.entries(wholeStorage)
      .filter(([key, value]) => AccountKey.is(key) && value !== null)
      .map(([key]) => AccountKey.decode(key)[0]);
  }

  static LOCKTIME = 1 * 60 * 1000; // 1 minutes

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

  async unlockUtxos(): Promise<void> {
    return Browser.storage.local.remove(WalletStorageKey.LOCKED_OUTPOINTS);
  }

  private async getLockedOutpoints(): Promise<Set<string>> {
    try {
      await this.unlockOutpoints();
    } catch (e) {
      /* ignore */
    }
    const { [WalletStorageKey.LOCKED_OUTPOINTS]: lockedOutpoints } =
      await Browser.storage.local.get(WalletStorageKey.LOCKED_OUTPOINTS);

    if (!lockedOutpoints) return new Set();
    return new Set(lockedOutpoints.map((o: any) => `${o.txID}:${o.vout}`));
  }
}

function getMainAccountsIDs(network: NetworkString): AccountID[] {
  if (network === 'liquid') {
    return [MainAccountLegacy, MainAccount];
  } else {
    return [MainAccountLegacy, MainAccountTest];
  }
}
