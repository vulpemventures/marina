import React from 'react';
import cx from 'classnames';

interface Props {
  assetBalance: number;
  assetImgPath: string;
  assetTicker: string;
  bigBalanceText?: boolean;
  className?: string;
  fiatBalance: number;
  fiatCurrency: '$' | '€';
}

const Balance: React.FC<Props> = ({
  bigBalanceText = false,
  className,
  assetBalance,
  assetImgPath,
  assetTicker,
  fiatBalance,
  fiatCurrency,
}) => {
  //
  let formattedFiatBalance;
  if (fiatCurrency === '$') {
    formattedFiatBalance = `$${fiatBalance} USD`;
  } else if (fiatCurrency === '€') {
    formattedFiatBalance = `${fiatBalance} EUR`;
  }

  return (
    <div className={className}>
      <img
        className="w-11 mt-0.5 block mx-auto mb-2"
        src={assetImgPath}
        alt="liquid bitcoin logo"
      />
      <div>
        <p
          className={cx('text-grayDark  font-medium', {
            'text-3xl': bigBalanceText,
            'text-lg': !bigBalanceText,
          })}
        >
          {assetBalance} {assetTicker}
        </p>
        {/* <p className="text-grayLight text-sm font-medium">{formattedFiatBalance}</p> */}
      </div>
    </div>
  );
};

export default Balance;
