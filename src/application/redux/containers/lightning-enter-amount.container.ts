import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type {
  LightningAmountProps,
} from '../../../presentation/wallet/receive/lightning-enter-amount';
import LightningAmountView from '../../../presentation/wallet/receive/lightning-enter-amount';
import { selectEsploraURL } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): LightningAmountProps => {
  return {
    network: state.app.network,
    explorerURL: selectEsploraURL(state),
  };
};

const LightningAmount = connect(mapStateToProps)(LightningAmountView);

export default LightningAmount;
