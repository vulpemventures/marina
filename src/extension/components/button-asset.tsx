import type { Asset } from 'marina-provider';
import React from 'react';
import { formatAssetName, formatDecimalAmount, fromSatoshi } from '../utility';
import AssetIcon from './assetIcon';

interface Props {
  asset: Asset;
  disabled?: boolean;
  handleClick: (asset: Asset) => void;
  type?: 'submit' | 'button' | 'reset';
  quantity?: number;
}

const ButtonAsset: React.FC<Props> = ({
  asset,
  disabled = false,
  quantity,
  handleClick,
  type = 'button',
}: Props) => {
  return (
    <button
      disabled={disabled}
      className="focus:outline-none h-14 flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
      onClick={() => handleClick(asset)}
      type={type}
    >
      <div className="flex flex-row items-center">
        <AssetIcon assetHash={asset.assetHash} className="w-8 mr-1.5" />
        <div className="flex flex-col text-left">
          <span className="text-grayDark text-sm font-medium">{formatAssetName(asset.name)}</span>
          <span className="text-grayLight text-xs font-medium">{asset.ticker}</span>
        </div>
      </div>
      <div className="flex flex-row">
        <div className="text-sm font-medium">
          {formatDecimalAmount(fromSatoshi(quantity ?? 0, asset.precision))}
        </div>
        <img className="ml-1.5" src="assets/images/chevron-right.svg" alt="chevron-right" />
      </div>
    </button>
  );
};

export default ButtonAsset;
