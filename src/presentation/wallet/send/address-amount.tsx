import React from 'react';
import { useHistory } from 'react-router';
import Balance from '../../components/balance';
import ShellPopUp from '../../components/shell-popup';
import { fromSatoshi } from '../../utils';
import { useDispatch } from 'react-redux';
import { flushPendingTx } from '../../../application/redux/actions/transaction';
import type { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import AddressAmountEnhancedForm from '../../components/address-amount-form';
import type { NetworkString } from 'ldk';
import type { TransactionState } from '../../../application/redux/reducers/transaction-reducer';
import type { Asset } from '../../../domain/assets';
import type { Account } from '../../../domain/account';
import { DEFAULT_ROUTE } from '../../routes/constants';

export interface AddressAmountProps {
  changeAccount: Account;
  network: NetworkString;
  transaction: TransactionState;
  balances: BalancesByAsset;
  transactionAsset: Asset;
}

const AddressAmountView: React.FC<AddressAmountProps> = ({
  changeAccount,
  network,
  transaction,
  balances,
  transactionAsset,
}) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const handleBackBtn = async () => {
    await dispatch(flushPendingTx()).catch(console.error);
    history.push(DEFAULT_ROUTE);
  };

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance
        assetHash={transaction.sendAsset}
        assetBalance={fromSatoshi(balances[transaction.sendAsset] ?? 0, transactionAsset.precision)}
        assetTicker={transactionAsset.ticker}
        className="mt-4"
      />

      <AddressAmountEnhancedForm
        dispatch={dispatch}
        history={history}
        balance={balances[transaction.sendAsset] ?? 0}
        transaction={transaction}
        network={network}
        asset={transactionAsset}
        account={changeAccount}
      />
    </ShellPopUp>
  );
};

export default AddressAmountView;
