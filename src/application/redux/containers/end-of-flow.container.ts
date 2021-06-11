import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import EndOfFlow, { EndOfFlowProps } from '../../../presentation/wallet/send/end-of-flow';
import { getOutputsAddresses } from '../selectors/transaction.selector';

const mapStateToProps = (state: RootReducerState): EndOfFlowProps => ({
  wallet: state.wallet,
  network: state.app.network,
  outputAddresses: getOutputsAddresses(state),
  pset: state.transaction.pset,
});

const SendEndOfFlow = connect(mapStateToProps)(EndOfFlow);

export default SendEndOfFlow;
