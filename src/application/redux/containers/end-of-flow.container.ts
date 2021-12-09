import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import EndOfFlow, { EndOfFlowProps } from '../../../presentation/wallet/send/end-of-flow';
import { selectAllAccounts } from '../selectors/wallet.selector';
import { selectEsploraURL } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): EndOfFlowProps => ({
  accounts: selectAllAccounts(state),
  pset: state.transaction.pset,
  explorerURL: selectEsploraURL(state),
  recipientAddress: state.transaction.sendAddress?.value,
  selectedUtxos: state.transaction.selectedUtxos ?? [],
});

const SendEndOfFlow = connect(mapStateToProps)(EndOfFlow);

export default SendEndOfFlow;
