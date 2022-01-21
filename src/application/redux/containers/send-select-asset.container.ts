import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { RootReducerState } from '../../../domain/common';
import SendSelectAssetView, {
  SendSelectAssetProps,
} from '../../../presentation/wallet/send/send-select-asset';
import { selectBalances } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): SendSelectAssetProps => {
  const balances = selectBalances(MainAccountID)(state);
  const getAsset = assetGetterFromIAssets(state.assets);
  return {
    balanceAssets: Object.keys(balances).map(getAsset),
    balances,
  };
};

const SendSelectAsset = connect(mapStateToProps)(SendSelectAssetView);

export default SendSelectAsset;
