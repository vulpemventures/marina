import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { EndOfFlowProps } from '../../../presentation/onboarding/end-of-flow';
import EndOfFlowOnboardingView from '../../../presentation/onboarding/end-of-flow';
import { selectHTTPExplorerURL } from '../selectors/app.selector';
import { hasMnemonicSelector } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): EndOfFlowProps => {
  return {
    mnemonic: state.onboarding.mnemonic,
    password: state.onboarding.password,
    isFromPopupFlow: state.onboarding.isFromPopupFlow,
    network: state.app.network,
    hasMnemonicRegistered: hasMnemonicSelector(state),
    explorerURL: selectHTTPExplorerURL()(state),
    walletVerified: state.onboarding.verified,
  };
};

const EndOfFlow = connect(mapStateToProps)(EndOfFlowOnboardingView);

export default EndOfFlow;
