import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import type { RootReducerState } from '../../../domain/common';
import LightningInvoiceView from '../../../presentation/wallet/send/lightning-enter-invoice';
import type { LightningInvoiceProps } from '../../../presentation/wallet/send/lightning-enter-invoice';
import { lbtcAssetByNetwork } from '../../utils/network';
import { selectBalances } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): LightningInvoiceProps => {
  const network = state.app.network;
  const balances = selectBalances(MainAccountID)(state);
  const lbtcBalance = balances[lbtcAssetByNetwork(network)];
  return { lbtcBalance, network };
};

const LightningInvoice = connect(mapStateToProps)(LightningInvoiceView);

export default LightningInvoice;
