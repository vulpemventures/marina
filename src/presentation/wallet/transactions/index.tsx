import React from 'react';
import { useLocation } from 'react-router-dom';
import ButtonList from '../../components/button-list';
import ButtonTransaction from '../../components/button-transaction';
import ShellPopUp from '../../components/shell-popup';
import BalanceSendReceive from '../components/balance-send-receive';

interface LocationState {
  assetTicker: string;
}

const Transactions: React.FC = () => {
  const { state } = useLocation<LocationState>();

  return (
    <ShellPopUp currentPage="Transactions">
      <BalanceSendReceive liquidBitcoinBalance={0.005} fiatBalance={120} fiatCurrency="$" />

      <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5"></div>

      <ButtonList title="Transactions" type="transactions">
        <ButtonTransaction
          assetTicker={state.assetTicker}
          txDate="19 oct 2020"
          txType="receive"
          quantity={0.00598562}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          txDate="27 sep 2020"
          txType="send"
          quantity={0.00478849}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
      </ButtonList>
    </ShellPopUp>
  );
};

export default Transactions;
