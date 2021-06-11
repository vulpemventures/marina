import React from 'react';
import cx from 'classnames';
import { browser } from 'webextension-polyfill-ts';
import { esploraURL } from '../utils';
import { useSelector } from 'react-redux';
import { RootReducerState } from '../../domain/common';

interface Props {
  assetBalance: string | number;
  assetImgPath: string;
  assetTicker: string;
  assetHash: string;
  bigBalanceText?: boolean;
  className?: string;
}

const Balance: React.FC<Props> = ({
  bigBalanceText = false,
  className,
  assetBalance,
  assetImgPath,
  assetTicker,
  assetHash,
}) => {
  const network = useSelector((state: RootReducerState) => state.app.network);

  const handleOpenExplorer = () =>
    browser.tabs.create({
      url: `${esploraURL[network]}/asset/${assetHash}`,
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
      </div>
    </div>
  );
};

export default Balance;
