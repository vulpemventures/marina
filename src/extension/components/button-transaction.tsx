import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import type { TxDetails } from '../../domain/transaction';
import { TxType } from '../../domain/transaction';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../utility';
import TxIcon from './txIcon';
import moment from 'moment';
import Modal from './modal';
import { Transaction } from 'liquidjs-lib';
import type { BlockHeader } from '../../background/utils';
import AssetIcon from './assetIcon';
import { confidentialValueToSatoshi } from 'liquidjs-lib/src/confidential';
import Button from './button';
import Browser from 'webextension-polyfill';
import {
  appRepository,
  useSelectNetwork,
  walletRepository,
} from '../../infrastructure/storage/common';
import { makeURLwithBlinders } from '../../utils';
import type { Asset } from 'marina-provider';

function txTypeFromTransfer(transfer?: number): TxType {
  if (transfer === undefined) return TxType.Unknow;
  if (transfer === 0) return TxType.SelfTransfer;
  if (transfer > 0) return TxType.Deposit;
  return TxType.Withdraw;
}

interface Props {
  txDetails?: TxDetails;
  assetSelected: Asset;
}

const ButtonTransaction: React.FC<Props> = ({ txDetails, assetSelected }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [transfer, setTransfer] = useState<{ amount: number; type: TxType }>();
  const [feeAmount, setFeeAmount] = useState<number>();
  const [txID, setTxID] = useState<string>();
  const [blockHeader, setBlockHeader] = useState<BlockHeader>();
  const [isLoading, setIsLoading] = useState(true);
  const network = useSelectNetwork();

  useEffect(() => {
    // compute transfer
    (async () => {
      if (!txDetails?.hex) return;
      const transaction = Transaction.fromHex(txDetails.hex);
      const txID = transaction.getId();
      setTxID(txID);

      let transferAmount = 0;

      for (let outIndex = 0; outIndex < transaction.outs.length; outIndex++) {
        const output = transaction.outs[outIndex];
        if (output.script.length === 0) {
          setFeeAmount(confidentialValueToSatoshi(output.value));
          continue;
        }

        const data = await walletRepository.getOutputBlindingData(txID, outIndex);
        if (!data || !data.blindingData) continue;
        if (data.blindingData.asset === assetSelected.assetHash) {
          transferAmount += data.blindingData.value;
        }
      }

      for (let inIndex = 0; inIndex < transaction.ins.length; inIndex++) {
        const input = transaction.ins[inIndex];
        const data = await walletRepository.getOutputBlindingData(
          Buffer.from(input.hash).reverse().toString('hex'),
          input.index
        );
        if (!data || !data.blindingData) continue;
        if (data.blindingData.asset === assetSelected.assetHash) {
          transferAmount -= data.blindingData.value;
        }
      }

      setTransfer({
        amount: transferAmount,
        type: txTypeFromTransfer(transferAmount),
      });

      if (!txDetails?.height || txDetails.height === -1) {
        setBlockHeader(undefined);
        return;
      }
      if (blockHeader && blockHeader.height === txDetails.height) return;
      const chainSource = await appRepository.getChainSource(network);
      if (!chainSource) return;
      const header = await chainSource.fetchBlockHeader(txDetails.height);
      setBlockHeader(header);
      await chainSource.close();
    })()
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [txDetails]);

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

  if (transfer?.amount === 0) return null;
  return (
    <>
      <button
        className="focus:outline-none h-14 flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
        onClick={() => handleClick()}
        type="button"
      >
        <div className="flex items-center">
          <TxIcon txType={transfer?.type ?? TxType.Unknow} />
          <span className="text-grayDark items-center mr-2 text-xs font-medium text-left">
            {blockHeader
              ? moment(blockHeader.timestamp * 1000).format('DD MMM YYYY')
              : isLoading
              ? '...'
              : 'mempool'}
          </span>
        </div>
        <div className="flex">
          <div className="text-primary whitespace-nowrap text-sm font-medium">
            {transfer ? (transfer.amount > 0 ? '+' : '') : ''}
            {transfer
              ? formatDecimalAmount(fromSatoshi(transfer.amount, assetSelected.precision))
              : '??'}{' '}
            {assetSelected.ticker}
          </div>
          <img className="ml-2" src="assets/images/chevron-right.svg" alt="chevron-right" />
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
          <p className="text-base font-medium">{transfer?.type}</p>
          {blockHeader && (
            <p className="text-xs font-light">
              {moment(blockHeader.timestamp * 1000).format('DD MMMM YYYY HH:mm')}
            </p>
          )}
        </div>
        <div className="mt-6 mb-4 space-y-6 text-left">
          <div className="flex flex-row">
            <p
              className={classNames('text-base antialiased', {
                'text-primary': txDetails?.height ? txDetails.height > 0 : false,
              })}
            >
              {txDetails?.height ? 'Confirmed' : 'Unconfirmed'}
            </p>
            <img
              className="w-6 h-6 -mt-0.5"
              src={txDetails?.height ? 'assets/images/confirm.svg' : 'assets/images/cross.svg'}
              alt="confirm"
            />
          </div>
          {transfer && (
            <div>
              <p className="text-sm font-medium">{transfer.amount > 0 ? 'Inbound' : 'Outbound'}</p>
              <p className="text-sm font-light">
                {fromSatoshiStr(transfer.amount, assetSelected.precision)}{' '}
                {assetSelected.ticker ?? assetSelected.assetHash.slice(0, 4)}
              </p>
            </div>
          )}
          <div>
            <p className="text-base font-medium">Fee</p>
            <p className="text-xs font-light">{fromSatoshiStr(feeAmount || 0)} L-BTC</p>
          </div>
          <div>
            <p className="text-base font-medium">ID transaction</p>
            <p className="wrap text-xs font-light break-all">{txID}</p>
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
