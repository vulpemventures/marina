import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { SettingsShowMnemonicProps } from '../../../presentation/settings/show-mnemonic';
import SettingsShowMnemonicView from '../../../presentation/settings/show-mnemonic';

const mapStateToProps = (state: RootReducerState): SettingsShowMnemonicProps => ({
  wallet: state.wallet,
});

const SettingsShowMnemonic = connect(mapStateToProps)(SettingsShowMnemonicView);

export default SettingsShowMnemonic;
