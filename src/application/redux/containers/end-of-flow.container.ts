import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { EndOfFlowProps } from '../../../presentation/wallet/send/end-of-flow';
import EndOfFlow from '../../../presentation/wallet/send/end-of-flow';
import { selectAccountsFromCoins, selectChangeAccount } from '../selectors/wallet.selector';
import { selectEsploraURL, selectNetwork } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): EndOfFlowProps => ({
  signerAccounts: selectAccountsFromCoins(state.transaction.selectedUtxos ?? [])(state),
  changeAccount: selectChangeAccount(state),
  pset: state.transaction.pset,
  explorerURL: selectEsploraURL(state),
  recipientAddress: state.transaction.sendAddress?.value,
  selectedUtxos: state.transaction.selectedUtxos ?? [],
  changeAddresses: state.transaction.changeAddresses.map((changeAddress) => changeAddress.value),
  network: selectNetwork(state),
});

const SendEndOfFlow = connect(mapStateToProps)(EndOfFlow);

export default SendEndOfFlow;
