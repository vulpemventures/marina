import React, { useEffect, useState } from 'react';
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
import type { BlockHeader } from '../../domain/chainsource';
import { useToastContext } from '../context/toast-context';

function txTypeFromTransfer(transfer?: number): TxType {
  if (transfer === undefined) return TxType.Unknow;
  if (transfer === 0) return TxType.SelfTransfer;
  if (transfer > 0) return TxType.Deposit;
  return TxType.Withdraw;
}

interface Props {
  txDetails: TxDetailsExtended;
  assetSelected: Asset;
}

const ButtonTransaction: React.FC<Props> = ({ txDetails, assetSelected }) => {
  const { walletRepository, appRepository, blockHeadersRepository, cache } = useStorageContext();
  const { showToast } = useToastContext();
  const [blockHeader, setBlockHeader] = useState<BlockHeader>();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!cache || !txDetails.height || txDetails.height < 0) return;
    blockHeadersRepository
      .getBlockHeader(cache.network, txDetails.height)
      .then((blockHeader) => {
        setBlockHeader(blockHeader);
      })
      .catch((e) => {
        console.error(e);
        showToast('Error: unable to get block header');
      });
  }, [txDetails.height, cache?.network]);

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
          {blockHeader ? (
            <span className="text-grayDark items-center mr-2 text-xs font-medium text-left">
              {moment(blockHeader.timestamp * 1000).format('DD MMM YYYY')}
            </span>
          ) : (
            <span className="bg-red text-xxs inline-flex items-center justify-center px-1 py-1 font-semibold leading-none text-white rounded-full">
              unconfirmed
            </span>
          )}
        </div>
        <div className="flex">
          <div className="text-primary whitespace-nowrap text-sm font-medium">
            {transferAmountIsDefined() ? (transferAmount() > 0 ? '+' : '') : ''}
            {transferAmountIsDefined()
              ? formatDecimalAmount(fromSatoshi(transferAmount(), assetSelected.precision), false)
              : '??'}{' '}
            {assetSelected.ticker}
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
          {blockHeader && (
            <p className="text-xs font-light">
              {moment(blockHeader.timestamp * 1000).format('DD MMMM YYYY HH:mm')}
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
            <p className="wrap text-xs font-light break-all">{txDetails.txID}</p>
          </div>
        </div>
        <Button className="w-full" onClick={() => handleOpenExplorer()}>
          See in Explorer
        </Button>
      </Modal>
    </>
  );
};

export default ButtonTransaction;
