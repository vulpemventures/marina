import React, { useState } from 'react';
import type { TxDetailsExtended } from '../../domain/transaction';
import { makeURLwithBlinders, TxType } from '../../domain/transaction';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../utility';
import TxIcon from './txIcon';
import moment from 'moment';
import Modal from './modal';
import { Transaction } from 'liquidjs-lib';
import AssetIcon from './assetIcon';
import Button from './button';
import Browser from 'webextension-polyfill';
import type { Asset } from 'marina-provider';
import { useStorageContext } from '../context/storage-context';
import type { RefundableSwapParams } from '../../domain/repository';
import { useHistory } from 'react-router';
import { SETTINGS_MENU_SWAPS_ROUTE } from '../routes/constants';

function txTypeFromTransfer(transfer?: number): TxType {
  if (transfer === undefined) return TxType.Unknow;
  if (transfer === 0) return TxType.SelfTransfer;
  if (transfer > 0) return TxType.Deposit;
  return TxType.Withdraw;
}

interface Props {
  assetSelected: Asset;
  swap: RefundableSwapParams | undefined;
  txDetails: TxDetailsExtended;
}

const ButtonTransaction: React.FC<Props> = ({ assetSelected, swap, txDetails }: Props) => {
  const history = useHistory();
  const { appRepository, cache, refundSwapFlowRepository, walletRepository } = useStorageContext();
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    setModalOpen(true);
  };

  const handleOpenExplorer = async () => {
    if (!txDetails?.hex) {
      console.error('txDetails.hex is undefined');
      return;
    }
    const transaction = Transaction.fromHex(txDetails.hex);
    const url = await makeURLwithBlinders(transaction, appRepository, walletRepository);
    await Browser.tabs.create({ url, active: false });
  };

  const handleRefund = async () => {
    await refundSwapFlowRepository.setParams(swap);
    history.push(SETTINGS_MENU_SWAPS_ROUTE);
  };

  const transferAmount = () => txDetails.txFlow[assetSelected.assetHash];
  const transferAmountIsDefined = () => transferAmount() !== undefined;

  return (
    <>
      <button
        className="focus:outline-none h-14 flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
        onClick={() => handleClick()}
        type="button"
      >
        <div className="flex items-center">
          <TxIcon txType={txTypeFromTransfer(transferAmount())} />
          {txDetails.height &&
          txDetails.height >= 0 &&
          cache?.blockHeaders.value[txDetails.height] ? (
            <span className="text-grayDark items-center text-xs font-medium text-left">
              {moment(cache.blockHeaders.value[txDetails.height].timestamp * 1000).format(
                'DD MMM YYYY'
              )}
            </span>
          ) : (
            <span className="bg-red text-xxs inline-flex px-1 py-1 font-semibold leading-none text-white rounded-full">
              unconfirmed
            </span>
          )}
        </div>
        <div className="flex items-center">
          <div className="flex flex-col">
            <span className="text-primary whitespace-nowrap text-sm font-medium">
              {transferAmountIsDefined() ? (transferAmount() > 0 ? '+' : '') : ''}
              {transferAmountIsDefined()
                ? formatDecimalAmount(fromSatoshi(transferAmount(), assetSelected.precision), false)
                : '??'}{' '}
              {assetSelected.ticker}
            </span>
            {swap && (
              <span className="bg-smokeLight text-xxs px-1 py-0 font-semibold text-white rounded-full">
                Refundable
              </span>
            )}
          </div>
          <img src="assets/images/chevron-right.svg" alt="chevron-right" />
        </div>
      </button>
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <div className="mx-auto text-center">
          <AssetIcon
            assetHash={assetSelected.assetHash}
            className="w-8 h-8 mt-0.5 block mx-auto mb-2"
          />
          <p className="text-base font-medium">{txTypeFromTransfer(transferAmount())}</p>
          {txDetails.height &&
            txDetails.height >= 0 &&
            cache?.blockHeaders.value[txDetails.height] && (
              <p className="text-xs font-light">
                {moment(cache.blockHeaders.value[txDetails.height].timestamp * 1000).format(
                  'DD MMMM YYYY HH:mm'
                )}
              </p>
            )}
        </div>
        <div className="mt-6 mb-4 space-y-6 text-left">
          <div className="flex flex-row">
            {txDetails?.height ? (
              <>
                <p className="text-primary text-base antialiased">Confirmed</p>
                <img className="w-6 h-6 -mt-0.5" src="assets/images/confirm.svg" alt="confirm" />
              </>
            ) : (
              <span className="bg-red inline-flex items-center justify-center px-2 py-1 text-xs font-semibold leading-none text-white rounded-full">
                Unconfirmed
              </span>
            )}
          </div>
          {transferAmountIsDefined() && (
            <div>
              <p className="text-sm font-medium">{transferAmount() > 0 ? 'Inbound' : 'Outbound'}</p>
              <p className="text-sm font-light">
                {fromSatoshiStr(transferAmount(), assetSelected.precision)}{' '}
                {assetSelected.ticker ?? assetSelected.assetHash.slice(0, 4)}
              </p>
            </div>
          )}
          <div>
            <p className="text-base font-medium">Fee</p>
            <p className="text-xs font-light">{fromSatoshiStr(txDetails.feeAmount || 0)} L-BTC</p>
          </div>
          <div>
            <p className="text-base font-medium">ID transaction</p>
            <p className="wrap text-xs font-light break-all">{txDetails.txid}</p>
          </div>
        </div>
        {swap ? (
          <div className="flex justify-between">
            <Button
              isOutline={true}
              className="bg-secondary hover:bg-secondary-light"
              onClick={handleRefund}
            >
              Refund
            </Button>
            <Button onClick={handleOpenExplorer}>Explorer</Button>
          </div>
        ) : (
          <Button onClick={handleOpenExplorer}>See in Explorer</Button>
        )}
      </Modal>
    </>
  );
};

export default ButtonTransaction;
