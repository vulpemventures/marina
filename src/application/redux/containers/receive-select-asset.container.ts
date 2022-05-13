import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import type { RootReducerState } from '../../../domain/common';
import type { ReceiveSelectAssetProps } from '../../../presentation/wallet/receive/receive-select-asset';
import ReceiveSelectAssetView from '../../../presentation/wallet/receive/receive-select-asset';
import { lbtcAssetByNetwork } from '../../utils/network';
import { selectNetwork } from '../selectors/app.selector';
import { selectBalances } from '../selectors/balance.selector';
import { selectAllAccountsIDs } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): ReceiveSelectAssetProps => {
  const balances = selectBalances(...selectAllAccountsIDs(state))(state);
  const network = selectNetwork(state);
  const getAsset = assetGetterFromIAssets(state.assets);
  return {
    network: state.app.network,
    assets: Object.keys(balances).map((assetHash: string) => {
      const canSubmarineSwap = [lbtcAssetByNetwork(network)].includes(assetHash);
      return {
        ...getAsset(assetHash),
        canSubmarineSwap,
      };
    }),
  };
};

const ReceiveSelectAsset = connect(mapStateToProps)(ReceiveSelectAssetView);

export default ReceiveSelectAsset;
