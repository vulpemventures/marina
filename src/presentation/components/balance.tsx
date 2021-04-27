import React, { useContext } from 'react';
import cx from 'classnames';
import { browser } from 'webextension-polyfill-ts';
import { esploraURL } from '../utils';
import { AppContext } from '../../application/store/context';

interface Props {
  assetBalance: string | number;
  assetImgPath: string;
  assetTicker: string;
  assetHash: string;
  bigBalanceText?: boolean;
  className?: string;
  fiatBalance?: string | number;
  fiatCurrency?: '$' | '€';
}

const Balance: React.FC<Props> = ({
  bigBalanceText = false,
  className,
  assetBalance,
  assetImgPath,
  assetTicker,
  assetHash,
}) => {
  const [{ app }] = useContext(AppContext);
  /* let formattedFiatBalance;
  if (fiatCurrency === '$') {
    formattedFiatBalance = `$${fiatBalance} USD`;
  } else if (fiatCurrency === '€') {
    formattedFiatBalance = `${fiatBalance} EUR`;
  } */

  const handleOpenExplorer = () =>
    browser.tabs.create({
      url: `${esploraURL[app.network.value]}/asset/${assetHash}`,
      active: false,
    });

  return (
    <div className={className}>
      <img
        onClick={handleOpenExplorer}
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
