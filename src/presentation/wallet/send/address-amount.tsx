import React from 'react';
import { useHistory } from 'react-router';
import { TRANSACTIONS_ROUTE } from '../../routes/constants';
import Balance from '../../components/balance';
import ShellPopUp from '../../components/shell-popup';
import { defaultPrecision, imgPathMapMainnet, imgPathMapRegtest } from '../../../application/utils';
import { fromSatoshi } from '../../utils';
import { useDispatch } from 'react-redux';
import { flushPendingTx } from '../../../application/redux/actions/transaction';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import AddressAmountEnhancedForm from '../../components/address-amount-form';
import { MasterPublicKey } from 'ldk';
import { Network } from '../../../domain/network';
import { TransactionState } from '../../../application/redux/reducers/transaction-reducer';
import { IAssets } from '../../../domain/assets';

export interface AddressAmountProps {
  masterPubKey: MasterPublicKey;
  network: Network;
  transaction: TransactionState;
  balances: BalancesByAsset;
  assets: IAssets;
}

const AddressAmountView: React.FC<AddressAmountProps> = ({
  masterPubKey,
  network,
  transaction,
  balances,
  assets,
}) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const assetTicker = assets[transaction.sendAsset]?.ticker ?? transaction.sendAsset.slice(0, 4);
  const assetPrecision = assets[transaction.sendAsset]?.precision ?? defaultPrecision;

  const handleBackBtn = () => {
    dispatch(flushPendingTx());
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: { assetHash: transaction.sendAsset, assetTicker, balances },
    });
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
        assetBalance={fromSatoshi(balances[transaction.sendAsset] ?? 0, assetPrecision)}
        assetImgPath={
          network === 'regtest'
            ? imgPathMapRegtest[assetTicker] ?? imgPathMapRegtest['']
            : imgPathMapMainnet[transaction.sendAsset] ?? imgPathMapMainnet['']
        }
        assetTicker={assetTicker}
        className="mt-4"
      />

      <AddressAmountEnhancedForm
        dispatch={dispatch}
        history={history}
        balances={balances}
        transaction={transaction}
        network={network}
        pubKey={masterPubKey}
        assets={assets}
        assetPrecision={assetPrecision}
      />
    </ShellPopUp>
  );
};

export default AddressAmountView;
