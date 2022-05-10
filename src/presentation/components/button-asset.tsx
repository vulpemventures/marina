import React from 'react';
import { formatAssetName, formatDecimalAmount, fromSatoshi } from '../utils';
import AssetIcon from './assetIcon';

interface Props {
  assetHash: string;
  assetName: string;
  assetTicker: string;
  assetPrecision: number;
  canSubmarineSwap: boolean;
  disabled?: boolean;
  handleClick: ({
    assetHash,
    assetName,
    assetTicker,
    assetPrecision,
    canSubmarineSwap,
  }: {
    [key: string]: string | number | boolean;
  }) => void;
  type?: 'submit' | 'button' | 'reset';
  quantity?: number;
}

const ButtonAsset: React.FC<Props> = ({
  assetHash,
  assetName,
  assetTicker,
  assetPrecision,
  canSubmarineSwap,
  disabled = false,
  quantity,
  handleClick,
  type = 'button',
}: Props) => {
  return (
    <button
      disabled={disabled}
      className="focus:outline-none h-14 flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
      onClick={() => handleClick({ assetHash, assetName, assetTicker, assetPrecision, canSubmarineSwap })}
      type={type}
    >
      <div className="flex flex-row items-center">
        <AssetIcon assetHash={assetHash} className="w-8 mr-1.5" />
        <div className="flex flex-col text-left">
          <span className="text-grayDark text-sm font-medium">{formatAssetName(assetName)}</span>
          <span className="text-grayLight text-xs font-medium">{assetTicker}</span>
        </div>
      </div>
      <div className="flex flex-row">
        <div className="text-sm font-medium">
          {quantity && formatDecimalAmount(fromSatoshi(quantity, assetPrecision))}
        </div>
        <img className="ml-1.5" src="assets/images/chevron-right.svg" alt="chevron-right" />
      </div>
    </button>
  );
};

export default ButtonAsset;
