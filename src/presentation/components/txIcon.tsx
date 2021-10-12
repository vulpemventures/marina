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

const TxIconImage: React.FC<{ txType: TxType }> = ({ txType }) => {
  return (
    <img
      className="w-8 mr-1.5"
      src={`assets/images/${getImgFilename(txType)}`}
      alt="receive transaction"
    />
  );
};

const TxIconDeposit: React.FC = React.memo(() => <TxIconImage txType={TxType.Deposit} />);
const TxIconWithdraw: React.FC = React.memo(() => <TxIconImage txType={TxType.Withdraw} />);
const TxIconSwap: React.FC = React.memo(() => <TxIconImage txType={TxType.Swap} />);

const TxIcon: React.FC<{ txType: TxType }> = ({ txType }) => {
  switch (txType) {
    case TxType.Deposit:
      return <TxIconDeposit />;
    case TxType.Withdraw:
      return <TxIconWithdraw />;
    case TxType.Swap:
      return <TxIconSwap />;
    default:
      return <TxIconDeposit />;
  }
};

export default TxIcon;
