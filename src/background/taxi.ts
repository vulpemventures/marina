import type { NetworkString } from 'ldk';
import type { RootReducerState } from '../domain/common';
import type { Store } from 'redux';
import { setTaxiAssets } from '../application/redux/actions/taxi';
import { selectTaxiAssetsForNetwork } from '../application/redux/selectors/taxi.selector';
import { fetchAssetsFromTaxi, taxiURL } from '../application/utils/taxi';

export async function fetchTaxiAssetsForNetwork(
  store: Store<RootReducerState>,
  network: NetworkString
): Promise<void> {
  try {
    const assets = await fetchAssetsFromTaxi(taxiURL[network]);
    const currentTaxiAssets = selectTaxiAssetsForNetwork(network)(store.getState());
    const sortAndJoin = (a: string[]) => a.sort().join('');
    if (sortAndJoin(assets) !== sortAndJoin(currentTaxiAssets)) {
      store.dispatch(setTaxiAssets(network, assets));
    }
  } catch (err: unknown) {
    console.warn(`fetch taxi assets error: ${(err as Error).message || 'unknown'}`);
    // ignore errors
  }
}
