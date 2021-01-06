import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../components/button';
import ButtonList from '../../components/button-list';
import ButtonTransaction from '../../components/button-transaction';
import Modal from '../../components/modal';
import ShellPopUp from '../../components/shell-popup';
import BalanceSendReceive from '../components/balance-send-receive';

interface LocationState {
  assetTicker: string;
}

const Transactions: React.FC = () => {
  const [isModalOpen, showModal] = useState(false);
  const { state } = useLocation<LocationState>();
  const openModal = () => showModal(true);
  const closeModal = () => showModal(false);
  // Transaction details
  const txId = '69540a36a63e4f06d298ecacf243639fd5dfc5a31a14f355e14168a59577392a';
  const txExplorerUrl = `https://blockstream.info/liquid/tx/${txId}`;
  const receptionDate = 'October 19, 2020';
  const amount = '0.00598562 BTC';
  const fee = '0.000000746 BTC';

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Transactions"
    >
      <BalanceSendReceive liquidBitcoinBalance={0.005} fiatBalance={120} fiatCurrency="$" />

      <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5"></div>

      <ButtonList title="Transactions" type="transactions">
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openModal}
          txDate="19 oct 2020"
          txType="receive"
          quantity={0.00598562}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openModal}
          txDate="27 sep 2020"
          txType="send"
          quantity={0.00478849}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openModal}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openModal}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openModal}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
      </ButtonList>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div className="mx-auto text-center">
          <img
            className="w-11 mt-0.5 block mx-auto mb-2"
            src="assets/images/liquid-assets/liquid-btc.svg"
            alt="liquid bitcoin logo"
          />
          <p className="font-medium">Received</p>
          <p className="text-xs font-light">{receptionDate}</p>
        </div>
        <div className="mt-6 mb-4 space-y-6 text-left">
          <p className="text-primary antialiased font-bold">Confirmed</p>
          <div>
            <p className="font-medium">Amount</p>
            <p className="text-xs font-light">{amount}</p>
          </div>
          <div>
            <p className="font-medium">Fee</p>
            <p className="text-xs font-light">{fee}</p>
          </div>
          <div>
            <p className="font-medium">ID transaction</p>
            <p className="wrap text-xs font-light break-all">{txId}</p>
          </div>
        </div>
        <a href={txExplorerUrl} target="_blank" rel="noreferrer">
          <Button className="w-full">See in Explorer</Button>
        </a>
      </Modal>
    </ShellPopUp>
  );
};

export default Transactions;
