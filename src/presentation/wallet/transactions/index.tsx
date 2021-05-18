import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { browser } from 'webextension-polyfill-ts';
import { DEFAULT_ROUTE, RECEIVE_ROUTE, SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ButtonList from '../../components/button-list';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import ButtonTransaction from '../../components/button-transaction';
import Modal from '../../components/modal';
import ReminderSaveMnemonicModal from '../../components/modal-reminder-save-mnemonic';
import ShellPopUp from '../../components/shell-popup';
import { getTxsDetails, imgPathMapMainnet, imgPathMapRegtest } from '../../../application/utils';
import { esploraURL, fromSatoshiStr } from '../../utils';
import { TxDisplayInterface, TxsHistory } from '../../../domain/transaction';
import { AssetsByNetwork } from '../../../domain/assets';
import { launchTxsUpdater, setAsset } from '../../../application/redux/actions/transaction';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../..';
import { Network } from '../../../domain/network';
import { Address } from '../../../domain/address';

interface LocationState {
  assetsBalance: { [hash: string]: number };
  assetHash: string;
  assetTicker: string;
  assetPrecision: number;
}

export interface TransactionsProps {
  addresses: Address[];
  assets: AssetsByNetwork;
  txsHistory: TxsHistory;
  network: Network;
}

const Transactions: React.FC<TransactionsProps> = ({ addresses, assets, txsHistory, network }) => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const assetImgPath =
    network === 'regtest'
      ? imgPathMapRegtest[state.assetTicker] ?? imgPathMapRegtest['']
      : imgPathMapMainnet[state.assetHash] ?? imgPathMapMainnet[''];

  // TxDetails Modal
  const [isTxDetailsModalOpen, showTxDetailsModal] = useState(false);
  const [modalTxDetails, setmodalTxDetails] = useState<TxDisplayInterface>();
  const closeTxDetailsModal = () => showTxDetailsModal(false);

  // Save mnemonic modal
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);
  const handleSaveMnemonicClose = () => showSaveMnemonicModal(false);
  const handleSaveMnemonicConfirm = () => history.push(RECEIVE_ROUTE);
  const handleReceive = () => showSaveMnemonicModal(true);
  const handleSend = () => {
    dispatch(setAsset(state.assetHash));
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };

  const handleBackBtn = () => history.push(DEFAULT_ROUTE);
  const handleOpenExplorer = async (url?: string) => {
    if (!url) {
      url = `${esploraURL[network]}/tx/${modalTxDetails?.txId}`;
    }

    await browser.tabs.create({ url, active: false });
  };

  /**
   * Update txs history once at first render
   */
  useEffect(() => {
    dispatch(launchTxsUpdater());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Generate transaction list for current asset
   * Will render new button tx as soon as data is ready
   * @returns Memoized widgets
   */
  const buttonTransactions = useMemo(() => {
    const openTxDetailsModal = (txId: string) => {
      showTxDetailsModal(true);
      const txsByTxId = getTxsDetails(
        Object.values(txsHistory[network]),
        network,
        addresses,
        assets[network]
      ).byTxId;
      setmodalTxDetails(txsByTxId[txId]);
    };

    const txsByAssets = getTxsDetails(
      Object.values(txsHistory[network]),
      network,
      addresses,
      assets[network]
    ).byAsset;

    return (
      txsByAssets[state.assetHash]
        // Descending order
        ?.sort((a, b) => b.blockTime - a.blockTime)
        .map(({ amount, dateContracted, toSelf, type, txId }, index) => (
          <ButtonTransaction
            amount={amount ?? 0}
            assetPrecision={state.assetPrecision}
            assetTicker={state.assetTicker}
            key={`${state.assetTicker}_${index}`}
            handleClick={openTxDetailsModal}
            toSelf={toSelf}
            txDate={dateContracted}
            txId={txId}
            txType={type}
          />
        ))
    );
  }, [
    network,
    assets,
    addresses,
    state.assetHash,
    state.assetTicker,
    state.assetPrecision,
    txsHistory,
  ]);

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Transactions"
    >
      <Balance
        assetHash={state.assetHash}
        assetBalance={fromSatoshiStr(
          state.assetsBalance[state.assetHash] ?? 0,
          state.assetPrecision
        )}
        assetImgPath={assetImgPath}
        assetTicker={state.assetTicker}
        bigBalanceText={true}
        fiatBalance={120}
        fiatCurrency="$"
      />

      <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />

      <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5" />

      <ButtonList title="Transactions" type="transactions">
        {buttonTransactions}
      </ButtonList>

      <Modal isOpen={isTxDetailsModalOpen} onClose={closeTxDetailsModal}>
        <div className="mx-auto text-center">
          <img
            className="w-8 h-8 mt-0.5 block mx-auto mb-2"
            src={assetImgPath}
            alt="liquid bitcoin logo"
          />
          <p className="text-base font-medium">
            {modalTxDetails?.type === 'receive' ? 'Received' : 'Send'}
          </p>
          <p className="text-xs font-light">{modalTxDetails?.date}</p>
        </div>
        <div className="mt-6 mb-4 space-y-6 text-left">
          <div className="flex flex-row">
            <p className="text-primary text-base antialiased font-bold">Confirmed</p>
            <img className="w-6 h-6 -mt-0.5" src="assets/images/confirm.svg" alt="confirm" />
          </div>
          <div>
            <p className="text-base font-medium">Amount</p>
            <p className="text-xs font-light">
              {fromSatoshiStr(modalTxDetails?.amount ?? 0)} {state.assetTicker}
            </p>
          </div>
          <div>
            <p className="text-base font-medium">Fee</p>
            <p className="text-xs font-light">
              {fromSatoshiStr(modalTxDetails?.fee ?? 0)}{' '}
              {assets[network][modalTxDetails?.feeAsset ?? '']?.ticker ?? ''}
            </p>
          </div>
          <div>
            <p className="text-base font-medium">ID transaction</p>
            <p className="wrap text-xs font-light break-all">{modalTxDetails?.txId}</p>
          </div>
        </div>
        <Button className="w-full" onClick={() => handleOpenExplorer(modalTxDetails?.unblindURL)}>
          See in Explorer
        </Button>
      </Modal>

      <ReminderSaveMnemonicModal
        isOpen={isSaveMnemonicModalOpen}
        handleClose={handleSaveMnemonicClose}
        handleConfirm={handleSaveMnemonicConfirm}
      />
    </ShellPopUp>
  );
};

export default Transactions;
