import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import type { RootReducerState } from '../../../domain/common';
import type { ConfirmationProps } from '../../../presentation/wallet/send/confirmation';
import ConfirmationView from '../../../presentation/wallet/send/confirmation';

const mapStateToProps = (state: RootReducerState): ConfirmationProps => ({
  transaction: state.transaction,
  network: state.app.network,
  getAsset: assetGetterFromIAssets(state.assets),
});

const Confirmation = connect(mapStateToProps)(ConfirmationView);

export default Confirmation;
