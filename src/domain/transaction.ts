import { AssetHash, ElementsValue, networks, script, Transaction } from 'liquidjs-lib';
import type { AppRepository, WalletRepository } from './repository';
import type { ScriptDetails } from 'marina-provider';

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

// the raw tx data, as returned by the node & persisted in the db
// we use that to compute the tx flow and build a TxDetailsExtended object used by the UI
export interface TxDetails {
  height?: number;
  hex?: string;
}

// the "flow" of the transaction, relative to the wallet state
// the key is the asset hash, the value is the amount, positive if the asset is received by the wallet, negative if the asset is sent
export type TxFlow = Record<string, number>;

export interface TxDetailsExtended extends TxDetails {
  txID: string;
  txFlow: TxFlow;
  feeAmount: number;
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
  for (let vout = 0; vout < transaction.outs.length; vout++) {
    const output = transaction.outs[vout];
    if (output.script.length === 0) continue;
    const [data] = await walletRepository.getOutputBlindingData({ txID, vout });
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

export function computeTxDetailsExtended(
  appRepository: AppRepository,
  walletRepository: WalletRepository,
  scriptsState: Record<string, ScriptDetails>
) {
  return async (details: TxDetails): Promise<TxDetailsExtended> => {
    if (!details.hex) {
      return {
        ...details,
        txID: '',
        txFlow: {},
        feeAmount: 0,
      };
    }
    const transaction = Transaction.fromHex(details.hex);
    const txID = transaction.getId();

    let feeAmount = 0;
    const txFlow: TxFlow = {};

    // iterate the output
    for (let outIndex = 0; outIndex < transaction.outs.length; outIndex++) {
      const output = transaction.outs[outIndex];
      // handle fee output
      const elementsValue = ElementsValue.fromBytes(output.value);
      if (output.script.length === 0) {
        feeAmount = elementsValue.number;
        continue;
      }
      if (!scriptsState[output.script.toString('hex')]) continue;

      if (elementsValue.isConfidential) {
        const [data] = await walletRepository.getOutputBlindingData({ txID, vout: outIndex });
        if (!data || !data.blindingData) continue;
        txFlow[data.blindingData.asset] =
          (txFlow[data.blindingData.asset] || 0) + data.blindingData.value;
        continue;
      }

      // skip burn outputs
      if (script.decompile(output.script)?.includes(script.OPS.OP_RETURN)) continue;
      const asset = AssetHash.fromBytes(output.asset).hex;
      txFlow[asset] = (txFlow[asset] || 0) + elementsValue.number;
    }

    for (let inIndex = 0; inIndex < transaction.ins.length; inIndex++) {
      const input = transaction.ins[inIndex];
      const inputTxID = Buffer.from(input.hash).reverse().toString('hex');
      const inputPrevoutIndex = input.index;

      const output = await walletRepository.getWitnessUtxo(inputTxID, inputPrevoutIndex);
      if (!output) continue;
      if (!scriptsState[output.script.toString('hex')]) continue;
      const elementsValue = ElementsValue.fromBytes(output.value);

      if (elementsValue.isConfidential) {
        const [data] = await walletRepository.getOutputBlindingData({
          txID: inputTxID,
          vout: inputPrevoutIndex,
        });
        if (!data || !data.blindingData) continue;
        txFlow[data.blindingData.asset] =
          (txFlow[data.blindingData.asset] || 0) - data.blindingData.value;
        continue;
      }

      const asset = AssetHash.fromBytes(output.asset).hex;
      txFlow[asset] = (txFlow[asset] || 0) - elementsValue.number;
    }
    const network = await appRepository.getNetwork();
    if (!network) throw new Error('network not found');

    // if the flow for L-BTC is -feeAmount, remove it
    if (txFlow[networks[network].assetHash] + feeAmount === 0) {
      if (Object.keys(txFlow).length === 1) {
        // this prevent to remove the flow if there is only the L-BTC one (self transfer L-BTC case)
        txFlow[networks[network].assetHash] = 0;
      } else {
        delete txFlow[networks[network].assetHash];
      }
    }

    return {
      ...details,
      txID,
      txFlow,
      feeAmount,
    };
  };
}
