import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import EndOfFlow, { EndOfFlowProps } from '../../../presentation/wallet/send/end-of-flow';
import { getExplorerURLSelector } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): EndOfFlowProps => ({
  wallet: state.wallet,
  network: state.app.network,
  restorerOpts: state.wallet.restorerOpts,
  pset: state.transaction.pset,
  explorerURL: getExplorerURLSelector(state),
});

const SendEndOfFlow = connect(mapStateToProps)(EndOfFlow);

export default SendEndOfFlow;
