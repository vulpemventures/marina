import { TxTypeEnum } from '../../domain/transaction';

function getImgFilename(txType: TxTypeEnum): string {
  switch (txType) {
    case TxTypeEnum.Deposit:
      return 'receive-filled.svg';
    case TxTypeEnum.Withdraw:
      return 'send-filled.svg';
    case TxTypeEnum.Swap:
      return 'atomic-swap.svg';
    default:
      return 'receive-filled.svg'; // TODO need default icon
  }
}

const TxIcon: React.FC<{ txType: TxTypeEnum }> = ({ txType }) => {
  return (
    <img
      className="w-8 mr-1.5"
      src={`assets/images/${getImgFilename(txType)}`}
      alt="receive transaction"
    />
  );
};

export default TxIcon;
