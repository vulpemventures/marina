import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import { selectExplorerURLs, selectNetwork } from '../selectors/app.selector';
import type { SettingsExplorerProps } from '../../../presentation/settings/explorer';
import SettingsExplorerView from '../../../presentation/settings/explorer';

const mapStateToProps = (state: RootReducerState): SettingsExplorerProps => {
  const network = selectNetwork(state);
  return {
    network,
    currentExplorerURLs: selectExplorerURLs(network)(state),
  };
};

const SettingsExplorer = connect(mapStateToProps)(SettingsExplorerView);

export default SettingsExplorer;
