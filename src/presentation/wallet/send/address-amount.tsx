import React from 'react';
import { useHistory } from 'react-router';
import Balance from '../../components/balance';
import ShellPopUp from '../../components/shell-popup';
import { getAssetImage } from '../../../application/utils';
import { fromSatoshi } from '../../utils';
import { useDispatch } from 'react-redux';
import { flushPendingTx } from '../../../application/redux/actions/transaction';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import AddressAmountEnhancedForm from '../../components/address-amount-form';
import { MasterPublicKey, NetworkString, StateRestorerOpts } from 'ldk';
import { TransactionState } from '../../../application/redux/reducers/transaction-reducer';
import { Asset, IAssets } from '../../../domain/assets';
import { DEFAULT_ROUTE } from '../../routes/constants';

export interface AddressAmountProps {
  masterPubKey: MasterPublicKey;
  restorerOpts: StateRestorerOpts;
  network: NetworkString;
  transaction: TransactionState;
  balances: BalancesByAsset;
  transactionAsset: Asset;
  assets: IAssets;
}

const AddressAmountView: React.FC<AddressAmountProps> = ({
  masterPubKey,
  restorerOpts,
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
        assetImgPath={getAssetImage(transaction.sendAsset)}
        assetTicker={transactionAsset.ticker}
        className="mt-4"
      />

      <AddressAmountEnhancedForm
        dispatch={dispatch}
        history={history}
        balances={balances}
        transaction={transaction}
        restorerOpts={restorerOpts}
        network={network}
        pubKey={masterPubKey}
        assets={assets}
        assetPrecision={transactionAsset.precision}
      />
    </ShellPopUp>
  );
};

export default AddressAmountView;
