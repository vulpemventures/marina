import { Transaction } from 'liquidjs-lib';
import type { AppRepository, Outpoint, WalletRepository } from './repository';

export type UnblindingData = {
  value: number;
  asset: string;
  assetBlindingFactor: string;
  valueBlindingFactor: string;
};

export enum TxType {
  SelfTransfer = 'SelfTransfer',
  Deposit = 'Deposit',
  Withdraw = 'Withdraw',
  Swap = 'Swap',
  Unknow = 'Unknow',
}

export interface TxDetails {
  height?: number;
  hex?: string;
}

export interface UnblindedOutput {
  txID: string;
  vout: number;
  blindingData?: UnblindingData;
}

export interface CoinSelection {
  utxos: UnblindedOutput[];
  changeOutputs?: { asset: string; amount: number }[];
}

export function computeBalances(utxos: UnblindedOutput[]): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const utxo of utxos) {
    if (!utxo.blindingData) continue;
    const { asset, value } = utxo.blindingData;
    balances[asset] = (balances[asset] || 0) + value;
  }
  return balances;
}

const reverseHex = (hex: string) => Buffer.from(hex, 'hex').reverse().toString('hex');

export async function makeURLwithBlinders(
  transaction: Transaction,
  appRepository: AppRepository,
  walletRepository: WalletRepository
) {
  const webExplorerURL = await appRepository.getWebExplorerURL();
  if (!webExplorerURL) {
    throw new Error('web explorer url not found');
  }
  const txID = transaction.getId();

  const blinders: string[] = [];
  for (let i = 0; i < transaction.outs.length; i++) {
    const output = transaction.outs[i];
    if (output.script.length === 0) continue;
    const data = await walletRepository.getOutputBlindingData(txID, i);
    if (!data || !data.blindingData) continue;

    blinders.push(
      `${data.blindingData.value},${data.blindingData.asset},${reverseHex(
        data.blindingData.valueBlindingFactor
      )},${reverseHex(data.blindingData.assetBlindingFactor)}`
    );
  }

  const url = `${webExplorerURL}/tx/${txID}#blinded=${blinders.join(',')}`;
  return url;
}

export async function lockTransactionInputs(
  walletRepository: WalletRepository,
  txHex: string
): Promise<void> {
  const transaction = Transaction.fromHex(txHex);
  return walletRepository.lockOutpoints(
    transaction.ins.map((input) => ({
      txID: Buffer.from(input.hash).reverse().toString('hex'),
      vout: input.index,
    }))
  );
}
