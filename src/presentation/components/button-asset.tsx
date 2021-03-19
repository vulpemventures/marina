import React from 'react';
import { formatDecimalAmount, fromSatoshi } from '../utils';

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
  return (
    <button
      disabled={disabled}
      className="focus:outline-none h-14 flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
      onClick={() => handleClick({ assetHash, assetName, assetTicker })}
      type={type}
    >
      <div className="flex flex-row items-center">
        <img className="w-8 mr-1.5" src={assetImgPath} alt="liquid asset" />
        <div className="flex flex-col text-left">
          <span className="text-grayDark text-base font-medium">{assetName || 'Unknown'}</span>
          <span className="text-grayLight text-xs font-medium">{assetTicker}</span>
        </div>
      </div>
      <div className="flex flex-row">
        <div className="text-base font-medium">{formatDecimalAmount(fromSatoshi(quantity))}</div>
        <img className="ml-2" src="assets/images/chevron-right.svg" alt="chevron-right" />
      </div>
    </button>
  );
};

export default ButtonAsset;
