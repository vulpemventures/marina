import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import browser from 'webextension-polyfill';
import {
  BACKUP_UNLOCK_ROUTE,
  DEFAULT_ROUTE,
  RECEIVE_ADDRESS_ROUTE,
  SEND_ADDRESS_AMOUNT_ROUTE,
} from '../../routes/constants';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ButtonList from '../../components/button-list';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import ButtonTransaction from '../../components/button-transaction';
import Modal from '../../components/modal';
import ShellPopUp from '../../components/shell-popup';
import { txTypeAsString } from '../../../application/utils/transaction';
import { fromSatoshiStr } from '../../utils';
import type { TxDisplayInterface } from '../../../domain/transaction';
import type { IAssets } from '../../../domain/assets';
import { setAsset } from '../../../application/redux/actions/transaction';
import { useDispatch } from 'react-redux';
import { txHasAsset } from '../../../application/redux/selectors/transaction.selector';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import moment from 'moment';
import { updateTaskAction } from '../../../application/redux/actions/task';
import { MainAccountID } from '../../../domain/account';
import type { NetworkString } from 'ldk';
import SaveMnemonicModal from '../../components/modal-save-mnemonic';
import AssetIcon from '../../components/assetIcon';
import ModalBottomSheet from '../../components/modal-bottom-sheet';

interface LocationState {
  assetsBalance: { [hash: string]: number };
  assetHash: string;
  assetTicker: string;
  assetPrecision: number;
  canSubmarineSwap: boolean;
}

export interface TransactionsProps {
  assets: IAssets;
  transactions: TxDisplayInterface[];
  webExplorerURL: string;
  network: NetworkString;
  isWalletVerified: boolean;
}

const TransactionsView: React.FC<TransactionsProps> = ({
  assets,
  transactions,
  webExplorerURL,
  network,
  isWalletVerified,
}) => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  // TxDetails Modal
  const [modalTxDetails, setModalTxDetails] = useState<TxDisplayInterface>();

  // submarine swap bottom sheet modal
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Save mnemonic modal
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);
  const handleSaveMnemonicClose = () => showSaveMnemonicModal(false);
  const handleSaveMnemonicConfirm = async () => {
    await browser.tabs.create({ url: `home.html#${BACKUP_UNLOCK_ROUTE}` });
  };
  const handleReceive = () => {
    if (!isWalletVerified) {
      showSaveMnemonicModal(true);
    } if (state.canSubmarineSwap) {
      setShowBottomSheet(true);
    } else {
      history.push(`${RECEIVE_ADDRESS_ROUTE}/${state.assetHash}`);
    }
  };

  const handleSend = async () => {
    if (state.canSubmarineSwap) {
      setShowBottomSheet(true);
    } else {
      await dispatch(setAsset(state.assetHash));
      history.push(SEND_ADDRESS_AMOUNT_ROUTE);
    }
  };

  const handleBackBtn = () => history.push(DEFAULT_ROUTE);
  const handleOpenExplorer = async () => {
    if (!modalTxDetails) return;
    const url = `${webExplorerURL}${modalTxDetails.webExplorersBlinders}`;
    await browser.tabs.create({ url, active: false });
  };

  // update tx history for main account once at first render
  useEffect(() => {
    dispatch(updateTaskAction(MainAccountID, network)).catch(console.error);
    return () => {
      setModalTxDetails(undefined);
    };
  }, []);

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Transactions"
    >
      {state && (
        <>
          <Balance
            assetHash={state.assetHash}
            assetBalance={fromSatoshiStr(
              state.assetsBalance[state.assetHash] ?? 0,
              state.assetPrecision
            )}
            assetTicker={state.assetTicker}
            bigBalanceText={true}
          />

          <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />

          <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5" />

          <div className="h-60 rounded-xl mb-1">
            <ButtonList title="Transactions" emptyText="Your transactions will appear here">
              {transactions
                .filter(txHasAsset(state.assetHash))
                // Descending order
                .sort((a, b) => {
                  if (!a.blockTimeMs || !b.blockTimeMs) return 0;
                  const momentB = moment(b.blockTimeMs);
                  const momentA = moment(a.blockTimeMs);
                  return momentB.diff(momentA);
                })
                .map((tx, index) => {
                  return (
                    <ButtonTransaction
                      assetHash={state.assetHash}
                      assetPrecision={state.assetPrecision}
                      assetTicker={state.assetTicker}
                      key={index}
                      handleClick={() => {
                        setModalTxDetails(tx);
                      }}
                      tx={tx}
                    />
                  );
                })}
            </ButtonList>
          </div>
        </>
      )}

      <ModalBottomSheet isOpen={showBottomSheet} onClose={() => setShowBottomSheet(false)}>
        <h1 className="text-lg">Select network</h1>
        <div className="flex justify-center">
          <div className="h-15 p-2" onClick={console.log}>
            <img
              className="w-10 h-10 mt-0.5 block mx-auto mb-2"
              src={'assets/images/liquid-network-logo.png'}
              alt="liquid network logo"
            />
            <p className='text-xs'>Liquid Network</p>
          </div>
          <div className="h-15 p-2" onClick={console.log}>
            <img
              className="w-10 h-10 mt-0.5 block mx-auto mb-2"
              src={'assets/images/zap.png'}
              alt="lightning network logo"
            />
            <p className='text-xs'>Lightning Network</p>
          </div>

        </div>
      </ModalBottomSheet>

      <Modal isOpen={modalTxDetails !== undefined} onClose={() => setModalTxDetails(undefined)}>
        <div className="mx-auto text-center">
          <AssetIcon assetHash={state.assetHash} className="w-8 h-8 mt-0.5 block mx-auto mb-2" />
          <p className="text-base font-medium">{txTypeAsString(modalTxDetails?.type)}</p>
          {modalTxDetails && modalTxDetails.blockTimeMs && (
            <p className="text-xs font-light">
              {moment(modalTxDetails.blockTimeMs).format('DD MMMM YYYY')}
            </p>
          )}
        </div>
        <div className="mt-6 mb-4 space-y-6 text-left">
          <div className="flex flex-row">
            <p className="text-primary text-base antialiased font-bold">Confirmed</p>
            <img className="w-6 h-6 -mt-0.5" src="assets/images/confirm.svg" alt="confirm" />
          </div>
          {modalTxDetails?.transfers.map((transfer, i) => (
            <div key={i}>
              <p className="text-sm font-medium">{transfer.amount > 0 ? 'Inbound' : 'Outbound'}</p>
              <p className="text-sm font-light">
                {fromSatoshiStr(transfer.amount, assets[transfer.asset]?.precision)}{' '}
                {assets[transfer.asset]?.ticker ?? transfer.asset.slice(0, 4)}
              </p>
            </div>
          ))}
          <div>
            <p className="text-base font-medium">Fee</p>
            <p className="text-xs font-light">{fromSatoshiStr(modalTxDetails?.fee || 0)} L-BTC</p>
          </div>
          <div>
            <p className="text-base font-medium">ID transaction</p>
            <p className="wrap text-xs font-light break-all">{modalTxDetails?.txId}</p>
          </div>
        </div>
        <Button className="w-full" onClick={() => handleOpenExplorer()}>
          See in Explorer
        </Button>
      </Modal>

      <SaveMnemonicModal
        isOpen={isSaveMnemonicModalOpen}
        handleClose={handleSaveMnemonicClose}
        handleConfirm={handleSaveMnemonicConfirm}
      />
    </ShellPopUp>
  );
};

export default TransactionsView;
