import React from 'react';

interface Props {
  assetTicker: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  txDate: string;
  txType: 'receive' | 'send';
  quantity: number;
}

const ButtonTransaction: React.FC<Props> = ({
  assetTicker,
  disabled = false,
  quantity,
  onClick,
  txDate,
  txType,
}: Props) => {
  return (
    <button
      disabled={disabled}
      className="flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full"
      onClick={onClick}
      type="button"
    >
      <div className="flex flex-row items-center">
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
        <div className="text-primary whitespace-nowrap text-sm font-medium">
          {quantity} {assetTicker}
        </div>
        <img className="ml-2" src="assets/images/chevron-right.svg" alt="chevron-right" />
      </div>
    </button>
  );
};

export default ButtonTransaction;
