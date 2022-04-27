import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { ChooseFeeProps } from '../../../presentation/wallet/send/choose-fee';
import ChooseFeeView from '../../../presentation/wallet/send/choose-fee';
import { lbtcAssetByNetwork } from '../../utils/network';
import { selectBalances } from '../selectors/balance.selector';
import { selectTaxiAssets } from '../selectors/taxi.selector';
import { selectAllAccountsIDs, selectMainAccount, selectUtxos } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): ChooseFeeProps => {
  const allAccountsIDs = selectAllAccountsIDs(state);

  return {
    network: state.app.network,
    assets: state.assets,
    balances: selectBalances(...allAccountsIDs)(state),
    taxiAssets: selectTaxiAssets(state),
    lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
    sendAddress: state.transaction.sendAddress,
    changeAddress: state.transaction.changeAddresses[0],
    sendAsset: state.transaction.sendAsset,
    sendAmount: state.transaction.sendAmount,
    account: selectMainAccount(state),
    utxos: selectUtxos(...allAccountsIDs)(state),
  };
};

const ChooseFee = connect(mapStateToProps)(ChooseFeeView);

export default ChooseFee;
