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
