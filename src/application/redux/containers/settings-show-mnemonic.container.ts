import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import SettingsShowMnemonicView, {
  SettingsShowMnemonicProps,
} from '../../../presentation/settings/show-mnemonic';

const mapStateToProps = (state: RootReducerState): SettingsShowMnemonicProps => ({
  wallet: state.wallet,
});

const SettingsShowMnemonic = connect(mapStateToProps)(SettingsShowMnemonicView);

export default SettingsShowMnemonic;
