import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import SettingsCosignersView, {
  SettingsCosignersProps,
} from '../../../presentation/settings/cosigners';

const SettingsCosigner = connect(
  (state: RootReducerState): SettingsCosignersProps => ({
    multisigAccountsData: state.wallet.restrictedAssetAccount
      ? [state.wallet.restrictedAssetAccount]
      : [],
  })
)(SettingsCosignersView);

export default SettingsCosigner;
