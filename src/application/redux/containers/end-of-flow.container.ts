import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import EndOfFlow, { EndOfFlowProps } from '../../../presentation/wallet/send/end-of-flow';
import { getExplorerURLSelector } from '../selectors/app.selector';
import { selectAllAccounts } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): EndOfFlowProps => ({
  accounts: selectAllAccounts(state),
  pset: state.transaction.pset,
  explorerURL: getExplorerURLSelector(state),
  recipientAddress: state.transaction.sendAddress?.value,
  selectedUtxos: state.transaction.selectedUtxos ?? [],
});

const SendEndOfFlow = connect(mapStateToProps)(EndOfFlow);

export default SendEndOfFlow;
