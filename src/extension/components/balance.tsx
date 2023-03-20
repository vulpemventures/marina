import React from 'react';
import cx from 'classnames';
import Browser from 'webextension-polyfill';
import AssetIcon from './assetIcon';
import { useStorageContext } from '../context/storage-context';

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
  const { appRepository } = useStorageContext();

  const handleOpenExplorer = async () => {
    const webExplorerURL = await appRepository.getWebExplorerURL();
    await Browser.tabs.create({
      url: `${webExplorerURL}/asset/${assetHash}`,
      active: false,
    });
  };

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
