import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import type { RootReducerState } from '../../../domain/common';
import type { SendSelectAssetProps } from '../../../presentation/wallet/send/send-select-asset';
import SendSelectAssetView from '../../../presentation/wallet/send/send-select-asset';
import { lbtcAssetByNetwork } from '../../utils/network';
import { selectNetwork } from '../selectors/app.selector';
import { selectBalances } from '../selectors/balance.selector';
import { selectAllAccountsIDsSpendableViaUI } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): SendSelectAssetProps => {
  const balances = selectBalances(...selectAllAccountsIDsSpendableViaUI(state))(state);
  const network = selectNetwork(state);
  const getAsset = assetGetterFromIAssets(state.assets);
  return {
    balanceAssets:
      Object.keys(balances).map((assetHash: string) => {
        const canSubmarineSwap = [lbtcAssetByNetwork(network)].includes(assetHash);
        return {
          ...getAsset(assetHash),
          canSubmarineSwap
        }
      }),
    balances,
    network
  };
};

const SendSelectAsset = connect(mapStateToProps)(SendSelectAssetView);

export default SendSelectAsset;
