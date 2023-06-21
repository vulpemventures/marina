import { AssetHash, ElementsValue, networks, script, Transaction } from 'liquidjs-lib';
import type { AppRepository, WalletRepository } from './repository';
import type { ScriptDetails, UnblindedOutput } from 'marina-provider';

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
  txid: string;
  txFlow: TxFlow;
  feeAmount: number;
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
  const txid = transaction.getId();

  const blinders: string[] = [];
  for (let vout = 0; vout < transaction.outs.length; vout++) {
    const output = transaction.outs[vout];
    if (output.script.length === 0) continue;
    const [data] = await walletRepository.getOutputBlindingData({ txid, vout });
    if (!data || !data.blindingData) continue;

    blinders.push(
      `${data.blindingData.value},${data.blindingData.asset},${reverseHex(
        data.blindingData.valueBlindingFactor
      )},${reverseHex(data.blindingData.assetBlindingFactor)}`
    );
  }

  const url = `${webExplorerURL}/tx/${txid}#blinded=${blinders.join(',')}`;
  return url;
}

export async function lockTransactionInputs(
  walletRepository: WalletRepository,
  txHex: string
): Promise<void> {
  const transaction = Transaction.fromHex(txHex);
  return walletRepository.lockOutpoints(
    transaction.ins.map((input) => ({
      txid: Buffer.from(input.hash).reverse().toString('hex'),
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
        txid: '',
        txFlow: {},
        feeAmount: 0,
      };
    }
    const transaction = Transaction.fromHex(details.hex);
    const txid = transaction.getId();

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
        const [data] = await walletRepository.getOutputBlindingData({ txid, vout: outIndex });
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

    let walletOwnsAllInputs = true;

    for (let inIndex = 0; inIndex < transaction.ins.length; inIndex++) {
      const input = transaction.ins[inIndex];
      const inputTxID = Buffer.from(input.hash).reverse().toString('hex');
      const inputPrevoutIndex = input.index;

      const output = await walletRepository.getWitnessUtxo(inputTxID, inputPrevoutIndex);
      if (!output || !scriptsState[output.script.toString('hex')]) {
        walletOwnsAllInputs = false;
        continue;
      }
      const elementsValue = ElementsValue.fromBytes(output.value);

      if (elementsValue.isConfidential) {
        const [data] = await walletRepository.getOutputBlindingData({
          txid: inputTxID,
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

    const txExtended: TxDetailsExtended = {
      ...details,
      txid,
      txFlow,
      feeAmount,
    };

    // check if we are paying the fees or not
    const lbtcFlow = txFlow[networks[network].assetHash];
    if (!lbtcFlow) return txExtended;

    if (lbtcFlow + feeAmount === 0) {
      // if the flow is exactly the fee amount, consider we are paying the fees
      txExtended.txFlow[networks[network].assetHash] = 0;
      return txExtended;
    }

    if (walletOwnsAllInputs) {
      // if we own all the inputs, it means we pay the fees
      txExtended.txFlow[networks[network].assetHash] = lbtcFlow + feeAmount;
      return txExtended;
    }

    return txExtended;
  };
}
