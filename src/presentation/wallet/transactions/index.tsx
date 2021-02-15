import React, { useContext, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { RECEIVE_ROUTE, SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ButtonList from '../../components/button-list';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import ButtonTransaction from '../../components/button-transaction';
import Modal from '../../components/modal';
import ModalConfirm from '../../components/modal-confirm';
import ShellPopUp from '../../components/shell-popup';
import { getAllAssetBalances } from '../../../application/store/actions/assets';
import { AppContext } from '../../../application/store/context';
import { lbtcAssetByNetwork } from '../../utils';

interface LocationState {
  assetTicker: string;
}

const Transactions: React.FC = () => {
  const history = useHistory();
  const [{ app }, dispatch] = useContext(AppContext);
  const [isTxDetailsModalOpen, showTxDetailsModal] = useState(false);
  const { state } = useLocation<LocationState>();
  const openTxDetailsModal = () => showTxDetailsModal(true);
  const closeTxDetailsModal = () => showTxDetailsModal(false);
  const [assetsBalance, setAssetsBalance] = useState<{ [hash: string]: number }>({});
  // Transaction details
  const txId = '69540a36a63e4f06d298ecacf243639fd5dfc5a31a14f355e14168a59577392a';
  const txExplorerUrl = `https://blockstream.info/liquid/tx/${txId}`;
  const receptionDate = 'October 19, 2020';
  const amount = '0.00598562 BTC';
  const fee = '0.000000746 BTC';

  // Save mnemonic modal
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);
  const handleSaveMnemonicClose = () => showSaveMnemonicModal(false);
  const handleSaveMnemonicConfirm = () => history.push(RECEIVE_ROUTE);

  // TODO: Show save mnemonic modal conditionnaly base on state
  // blocked by https://github.com/vulpemventures/marina/issues/15
  const handleReceive = () => showSaveMnemonicModal(true);
  const handleSend = () => history.push(SEND_ADDRESS_AMOUNT_ROUTE);

  useEffect(() => {
    dispatch(
      getAllAssetBalances(
        (balances) => setAssetsBalance(balances),
        (error) => console.log(error)
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Transactions"
    >
      <Balance
        bigBalanceText={true}
        liquidBitcoinBalance={
          (assetsBalance[lbtcAssetByNetwork(app.network.value)] ?? 0) / Math.pow(10, 8)
        }
        fiatBalance={120}
        fiatCurrency="$"
      />

      <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />

      <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5"></div>

      <ButtonList title="Transactions" type="transactions">
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openTxDetailsModal}
          txDate="19 oct 2020"
          txType="receive"
          quantity={0.00598562}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openTxDetailsModal}
          txDate="27 sep 2020"
          txType="send"
          quantity={0.00478849}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openTxDetailsModal}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openTxDetailsModal}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
        <ButtonTransaction
          assetTicker={state.assetTicker}
          onClick={openTxDetailsModal}
          txDate="7 apr 2020"
          txType="receive"
          quantity={0.00237845}
        />
      </ButtonList>

      <Modal isOpen={isTxDetailsModalOpen} onClose={closeTxDetailsModal}>
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

      <ModalConfirm
        btnTextClose="Cancel"
        btnTextConfirm="Save"
        isOpen={isSaveMnemonicModalOpen}
        onClose={handleSaveMnemonicClose}
        onConfirm={handleSaveMnemonicConfirm}
        title="Save your mnemonic"
      >
        <p className="text-base text-left">Save your mnemonic phrase to receive or send funds</p>
      </ModalConfirm>
    </ShellPopUp>
  );
};

export default Transactions;
