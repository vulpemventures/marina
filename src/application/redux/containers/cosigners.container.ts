import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import SettingsCosignersView, {
  SettingsCosignersProps,
} from '../../../presentation/settings/cosigners';
import { selectAllRestrictedAssetAccounts } from '../selectors/wallet.selector';

const SettingsCosigner = connect(
  (state: RootReducerState): SettingsCosignersProps => ({
    multisigAccountsData: selectAllRestrictedAssetAccounts(state),
  })
)(SettingsCosignersView);

export default SettingsCosigner;
