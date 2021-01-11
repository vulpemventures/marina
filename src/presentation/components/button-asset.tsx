import React from 'react';

interface Props {
  assetName: string;
  assetTicker: string;
  assetImgPath: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  type?: 'submit' | 'button' | 'reset';
  quantity: number;
}

const ButtonAsset: React.FC<Props> = ({
  assetName,
  assetTicker,
  assetImgPath,
  disabled = false,
  quantity,
  onClick,
  type = 'button',
}: Props) => {
  return (
    <button
      disabled={disabled}
      className="focus:outline-none flex flex-row items-center justify-between w-full px-4 py-2 bg-white rounded-full shadow-md"
      onClick={onClick}
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
        <div className="text-base font-medium">{quantity}</div>
        <img className="ml-4" src="assets/images/chevron-right.svg" alt="chevron-right" />
      </div>
    </button>
  );
};

export default ButtonAsset;
