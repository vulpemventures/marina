import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import { selectNetwork } from '../selectors/app.selector';
import type { SettingsExplorerCustomProps } from '../../../presentation/settings/explorer-custom';
import SettingsExplorerCustomView from '../../../presentation/settings/explorer-custom';

const mapStateToProps = (state: RootReducerState): SettingsExplorerCustomProps => ({
  network: selectNetwork(state),
});

const SettingsExplorerCustom = connect(mapStateToProps)(SettingsExplorerCustomView);

export default SettingsExplorerCustom;
