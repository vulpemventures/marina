import React, { useEffect, useState } from 'react';
import type { TxDetails } from '../../domain/transaction';
import { makeURLwithBlinders, TxType } from '../../domain/transaction';
import { formatDecimalAmount, fromSatoshi, fromSatoshiStr } from '../utility';
import TxIcon from './txIcon';
import moment from 'moment';
import Modal from './modal';
import { networks, Transaction } from 'liquidjs-lib';
import AssetIcon from './assetIcon';
import { confidentialValueToSatoshi } from 'liquidjs-lib/src/confidential';
import Button from './button';
import Browser from 'webextension-polyfill';
import type { Asset } from 'marina-provider';
import { useStorageContext } from '../context/storage-context';
import type { BlockHeader } from '../../domain/chainsource';

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
  const { walletRepository, blockHeadersRepository, appRepository } = useStorageContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [transfer, setTransfer] = useState<{ amount: number; type: TxType }>();
  const [feeAmount, setFeeAmount] = useState<number>();
  const [txID, setTxID] = useState<string>();
  const [blockHeader, setBlockHeader] = useState<BlockHeader>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // first of all, compute the transfer amount from blinding data and tx hex
      if (!txDetails?.hex) return;
      const transaction = Transaction.fromHex(txDetails.hex);
      const txID = transaction.getId();
      setTxID(txID);

      let transferAmount = 0;
      let lbtcFeeAmount = 0;

      let hasOutputWithAnotherAsset = false;

      for (let outIndex = 0; outIndex < transaction.outs.length; outIndex++) {
        const output = transaction.outs[outIndex];
        if (output.script.length === 0) {
          lbtcFeeAmount = confidentialValueToSatoshi(output.value);
          continue;
        }

        const data = await walletRepository.getOutputBlindingData(txID, outIndex);
        if (!data || !data.blindingData) continue;
        if (data.blindingData.asset === assetSelected.assetHash) {
          transferAmount += data.blindingData.value;
          continue;
        }
        hasOutputWithAnotherAsset = true;
      }

      const hasOutputWithSelectedAsset = transferAmount > 0;

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

      const network = await appRepository.getNetwork();
      if (!network) return;

      // ignore the tx where we don't have any output with the selected asset
      if (!hasOutputWithSelectedAsset) {
        setTransfer(undefined);
        return;
      }

      if (
        assetSelected.assetHash === networks[network].assetHash &&
        transferAmount + lbtcFeeAmount === 0 &&
        hasOutputWithAnotherAsset
      ) {
        // in case of L-BTC, ignore the tx where we only use LBTC to pay the fees
        setTransfer(undefined);
        return;
      }

      setTransfer({
        amount: transferAmount,
        type: txTypeFromTransfer(transferAmount),
      });
      setFeeAmount(lbtcFeeAmount);

      // get the block header, if not found in repository, fetch it from the chain
      // skip if the tx is not confirmed (height === -1)
      if (!txDetails?.height || txDetails.height === -1) {
        // check if the tx has been confirmed
        setBlockHeader(undefined);
        return;
      }

      if (blockHeader && blockHeader.height === txDetails.height) return;

      let header = await blockHeadersRepository.getBlockHeader(network, txDetails.height);

      if (!header) {
        const chainSource = await appRepository.getChainSource(network);
        if (!chainSource) return;
        header = await chainSource.fetchBlockHeader(txDetails.height);
        if (header) await blockHeadersRepository.setBlockHeader(network, header);
        await chainSource.close();
      }

      setBlockHeader(header);
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

  if (!transfer) return null;
  return (
    <>
      <button
        className="focus:outline-none h-14 flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
        onClick={() => handleClick()}
        type="button"
      >
        <div className="flex items-center">
          <TxIcon txType={transfer?.type ?? TxType.Unknow} />
          {blockHeader ? (
            <span className="text-grayDark items-center mr-2 text-xs font-medium text-left">
              {moment(blockHeader.timestamp * 1000).format('DD MMM YYYY')}
            </span>
          ) : isLoading ? (
            <div role="status" className="animate-pulse w-full">
              <div className="h-2.5 bg-primary rounded-full w-20"></div>
            </div>
          ) : (
            <span className="bg-red inline-flex items-center justify-center px-2 py-1 text-xs font-semibold leading-none text-white rounded-full">
              unconfirmed
            </span>
          )}
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
