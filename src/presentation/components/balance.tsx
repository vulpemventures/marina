import React from 'react';
import cx from 'classnames';
import browser from 'webextension-polyfill';
import { useSelector } from 'react-redux';
import { selectElectrsURL } from '../../application/redux/selectors/app.selector';

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
  const electrsURL = useSelector(selectElectrsURL);

  const handleOpenExplorer = () =>
    browser.tabs.create({
      url: `${electrsURL}/asset/${assetHash}`,
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

export default Balance;
