import {
  ChangeAddressFromAssetGetter,
  CoinSelectionResult,
  CoinSelector,
  CoinSelectorErrorFn,
  greedyCoinSelector,
  RecipientInterface,
  UnblindedOutput,
} from 'ldk';
import { AnyAction, Dispatch } from 'redux';
import { lockUtxo } from '../actions/utxos';

export const throwErrorHandler: CoinSelectorErrorFn = (
  asset: string,
  need: number,
  has: number
) => {
  throw new Error(`not enough funds to fill ${need}sats of ${asset} (available: ${has})`);
};

/**
 * Returns a custom coinSelector
 * @param dispatch if defined, will lock the selected utxos.
 */
export function customCoinSelector(dispatch?: Dispatch<AnyAction>): CoinSelector {
  console.log('xon customCoinSelector called');
  const greedy = greedyCoinSelector();
  if (!dispatch) return greedy;
  return (errorHandler = throwErrorHandler) =>
    (
      unspents: UnblindedOutput[],
      outputs: RecipientInterface[],
      changeGetter: ChangeAddressFromAssetGetter
    ): CoinSelectionResult => {
      const result = greedy(errorHandler)(unspents, outputs, changeGetter);
      console.log('xon result.selectedUtxos', result.selectedUtxos);
      for (const utxo of result.selectedUtxos) {
        void dispatch(lockUtxo(utxo));
      }
      return result;
    };
}
