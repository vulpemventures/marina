import React from 'react';

interface Props {
  assetHash: string;
  assetName: string;
  assetTicker: string;
  assetImgPath: string;
  disabled?: boolean;
  handleClick: ({ assetHash, assetName, assetTicker }: { [key: string]: string }) => void;
  type?: 'submit' | 'button' | 'reset';
  quantity: number;
}

const ButtonAsset: React.FC<Props> = ({
  assetHash,
  assetName,
  assetTicker,
  assetImgPath,
  disabled = false,
  quantity,
  handleClick,
  type = 'button',
}: Props) => {
  let formattedBalance = quantity.toString();
  // If decimal number truncate to 2 decimals without rounding and add ellipsis
  if (!Number.isInteger(quantity)) {
    formattedBalance = `${formattedBalance.slice(0, formattedBalance.indexOf('.') + 3)}...`;
  }

  return (
    <button
      disabled={disabled}
      className="focus:outline-none flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
      onClick={() => handleClick({ assetHash, assetName, assetTicker })}
      type={type}
    >
      <div className="flex flex-row">
        <img className="w-8 mr-1.5" src={assetImgPath} alt="liquid asset" />
        <div className="flex flex-col text-left">
          <span className="text-grayDark text-base font-medium">{assetName}</span>
          <span className="text-grayLight text-xs font-medium">{assetTicker}</span>
        </div>
      </div>
      <div className="flex flex-row">
        <div className="text-base font-medium">{formattedBalance}</div>
        <img className="ml-2" src="assets/images/chevron-right.svg" alt="chevron-right" />
      </div>
    </button>
  );
};

export default ButtonAsset;
