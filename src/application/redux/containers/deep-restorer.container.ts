import type { DeepRestorerProps } from './../../../presentation/settings/deep-restorer';
import SettingsDeepRestorerView from './../../../presentation/settings/deep-restorer';
import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import { selectAllAccountsIDs } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): DeepRestorerProps => ({
  restorationLoading: state.wallet.deepRestorer.restorerLoaders > 0,
  gapLimit: state.wallet.deepRestorer.gapLimit,
  error: state.wallet.deepRestorer.error,
  allAccountsIDs: selectAllAccountsIDs(state),
});

const SettingsDeepRestorer = connect(mapStateToProps)(SettingsDeepRestorerView);

export default SettingsDeepRestorer;
