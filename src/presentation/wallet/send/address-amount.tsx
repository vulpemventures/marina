import React from 'react';
import { useHistory } from 'react-router';
import Balance from '../../components/balance';
import ShellPopUp from '../../components/shell-popup';
import { fromSatoshi } from '../../utils';
import { useDispatch } from 'react-redux';
import { flushPendingTx } from '../../../application/redux/actions/transaction';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import AddressAmountEnhancedForm from '../../components/address-amount-form';
import { NetworkString } from 'ldk';
import { TransactionState } from '../../../application/redux/reducers/transaction-reducer';
import { Asset } from '../../../domain/assets';
import { Account } from '../../../domain/account';

export interface AddressAmountProps {
  account: Account;
  network: NetworkString;
  transaction: TransactionState;
  balances: BalancesByAsset;
  transactionAsset: Asset;
}

const AddressAmountView: React.FC<AddressAmountProps> = ({
  account,
  network,
  transaction,
  balances,
  transactionAsset,
}) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const handleBackBtn = async () => {
    await dispatch(flushPendingTx()).catch(console.error);
    history.goBack();
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
        account={account}
      />
    </ShellPopUp>
  );
};

export default AddressAmountView;
