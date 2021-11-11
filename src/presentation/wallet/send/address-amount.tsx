import React from 'react';
import { useHistory } from 'react-router';
import Balance from '../../components/balance';
import ShellPopUp from '../../components/shell-popup';
import { imgPathMapMainnet, imgPathMapRegtest } from '../../../application/utils';
import { fromSatoshi } from '../../utils';
import { useDispatch } from 'react-redux';
import { flushPendingTx } from '../../../application/redux/actions/transaction';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import AddressAmountEnhancedForm from '../../components/address-amount-form';
import { Network } from '../../../domain/network';
import { TransactionState } from '../../../application/redux/reducers/transaction-reducer';
import { Asset, IAssets } from '../../../domain/assets';
import { DEFAULT_ROUTE } from '../../routes/constants';
import { Account } from '../../../domain/account';

export interface AddressAmountProps {
  account: Account;
  network: Network;
  transaction: TransactionState;
  balances: BalancesByAsset;
  transactionAsset: Asset;
  assets: IAssets;
}

const AddressAmountView: React.FC<AddressAmountProps> = ({
  account,
  network,
  transaction,
  balances,
  transactionAsset,
  assets,
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
        assetImgPath={
          network === 'regtest'
            ? imgPathMapRegtest[transactionAsset.ticker] ?? imgPathMapRegtest['']
            : imgPathMapMainnet[transaction.sendAsset] ?? imgPathMapMainnet['']
        }
        assetTicker={transactionAsset.ticker}
        className="mt-4"
      />

      <AddressAmountEnhancedForm
        dispatch={dispatch}
        history={history}
        balances={balances}
        transaction={transaction}
        network={network}
        assets={assets}
        assetPrecision={transactionAsset.precision}
        account={account}
      />
    </ShellPopUp>
  );
};

export default AddressAmountView;
