import React from 'react';
import cx from 'classnames';
import browser from 'webextension-polyfill';
import { useSelector } from 'react-redux';
import { selectWebExplorerURL } from '../../application/redux/selectors/app.selector';
import AssetIcon from './assetIcon';

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
  const webExplorerURL = useSelector(selectWebExplorerURL());

  const handleOpenExplorer = () =>
    browser.tabs.create({
      url: `${webExplorerURL}/asset/${assetHash}`,
      active: false,
    });

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
