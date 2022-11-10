import React from 'react';
import cx from 'classnames';
import browser from 'webextension-polyfill';
import AssetIcon from './assetIcon';
import { appRepository } from '../../infrastructure/storage/common';

interface Props {
  assetBalance: string | number;
  assetTicker: string;
  assetHash: string;
  bigBalanceText?: boolean;
  className?: string;
}

const Balance: React.FC<Props> = ({
  bigBalanceText = false,
  className,
  assetBalance,
  assetTicker,
  assetHash,
}) => {
  const handleOpenExplorer = async () => {
    const network = await appRepository.getNetwork();
    const webExplorerURL = await appRepository.getWebExplorerURL(network ?? 'liquid');
    browser.tabs.create({
      url: `${webExplorerURL}/asset/${assetHash}`,
      active: false,
    });
  }

  return (
    <div className={className}>
      <AssetIcon
        assetHash={assetHash}
        className="w-11 mt-0.5 block mx-auto mb-2"
        onClick={handleOpenExplorer}
      />
      <div>
        <p
          className={cx('text-grayDark font-medium max-h-10', {
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

export default React.memo(Balance);
