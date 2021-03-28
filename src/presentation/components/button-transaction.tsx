import React from 'react';
import { TxType } from '../../domain/transaction';
import { formatDecimalAmount, fromSatoshi } from '../utils';

interface Props {
  amount: number;
  assetTicker: string;
  assetPrecision: number;
  disabled?: boolean;
  handleClick: (txId: string, toSelf: boolean) => void;
  toSelf: boolean;
  txDate: string;
  txId: string;
  txType: TxType;
}

const ButtonTransaction: React.FC<Props> = ({
  assetTicker,
  assetPrecision,
  disabled = false,
  amount,
  handleClick,
  toSelf,
  txDate,
  txId,
  txType,
}: Props) => {
  return (
    <button
      disabled={disabled}
      className="focus:outline-none h-14 flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
      data-toself={toSelf}
      onClick={() => handleClick(txId, toSelf)}
      type="button"
    >
      <div className="flex items-center">
        {txType === 'receive' ? (
          <img
            className="w-8 mr-1.5"
            src="assets/images/receive-filled.svg"
            alt="receive transaction"
          />
        ) : (
          <img className="w-8 mr-1.5" src="assets/images/send-filled.svg" alt="send transaction" />
        )}
        <span className="text-grayDark items-center mr-2 text-sm font-medium text-left">
          {txDate}
        </span>
      </div>
      <div className="flex">
        <div className="text-primary whitespace-nowrap text-sm font-medium">
          {txType === 'receive' ? '+' : '-'}
          {formatDecimalAmount(fromSatoshi(amount, assetPrecision))} {assetTicker}
        </div>
        <img className="ml-2" src="assets/images/chevron-right.svg" alt="chevron-right" />
      </div>
    </button>
  );
};

export default ButtonTransaction;
