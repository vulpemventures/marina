import React from 'react';
import { TxType } from '../../domain/transaction';

function getImgFilename(txType: TxType): string {
  switch (txType) {
    case TxType.Deposit:
      return 'receive-filled.svg';
    case TxType.Withdraw:
      return 'send-filled.svg';
    case TxType.Swap:
      return 'atomic-swap.svg';
    default:
      return 'receive-filled.svg'; // TODO need default icon
  }
}

const TxIcon: React.FC<{ txType: TxType }> = ({ txType }) => {
  return (
    <img
      className="w-8 mr-1.5"
      src={`assets/images/${getImgFilename(txType)}`}
      alt="receive transaction"
    />
  );
};

export default React.memo(TxIcon);
