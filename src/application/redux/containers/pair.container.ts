import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import PairCosignerView, { PairCosignerProps } from '../../../presentation/cosigner/pair';
import { getExplorerURLSelector } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): PairCosignerProps => ({
  encryptedMnemonic: state.wallet.mainAccount.encryptedMnemonic,
  explorerURL: getExplorerURLSelector(state),
  network: state.app.network,
});

const PairCosigner = connect(mapStateToProps)(PairCosignerView);

export default PairCosigner;
