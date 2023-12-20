import React, { useState } from 'react';
import cx from 'classnames';
import Browser from 'webextension-polyfill';
import AssetIcon from './assetIcon';
import { useStorageContext } from '../context/storage-context';
import { fromSpacesToSatoshis } from '../utility';
import Decimal from 'decimal.js';

interface Props {
  assetBalance: string;
  assetTicker: string;
  assetHash: string;
  bigBalanceText?: boolean;
  className?: string;
  loading?: boolean;
}

const Balance: React.FC<Props> = ({
  bigBalanceText = false,
  className,
  assetBalance,
  assetTicker,
  assetHash,
  loading,
}) => {
  const { appRepository } = useStorageContext();
  const [units, setUnits] = useState('lbtc');

  const rotateUnits = () => {
    if (units === 'lbtc') setUnits('bits');
    if (units === 'bits') setUnits('sats');
    if (units === 'sats') setUnits('lbtc');
  };

  const handleOpenExplorer = async () => {
    const webExplorerURL = await appRepository.getWebExplorerURL();
    await Browser.tabs.create({
      url: `${webExplorerURL}/asset/${assetHash}`,
      active: false,
    });
  };

  const PrettyBalance = () => {
    if (units === 'lbtc') {
      const [integer, decimals] = assetBalance.split('.');
      return (
        <>
          <span className="font-medium">{integer}.</span>
          <span className="font-light">{decimals} </span>
          <span className="font-medium">{assetTicker}</span>
        </>
      );
    }
    if (units === 'bits') {
      const sats = fromSpacesToSatoshis(assetBalance);
      const bits = Decimal.floor(Decimal.div(sats, 100)).toNumber();
      return (
        <>
          <span className="font-light">{bits} </span>
          <span className="font-medium">Bits</span>
        </>
      );
    }
    if (units === 'sats') {
      const sats = fromSpacesToSatoshis(assetBalance);
      return (
        <>
          <span className="font-light">{sats} </span>
          <span className="font-medium">Sats</span>
        </>
      );
    }
    return <></>;
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
          onClick={rotateUnits}
          className={cx('text-grayDark max-h-10', {
            'text-3xl': bigBalanceText && !loading,
            'text-lg': !bigBalanceText && !loading,
            'animate-pulse': loading,
          })}
        >
          {loading ? 'Loading...' : <PrettyBalance />}
        </p>
      </div>
    </div>
  );
};

export default React.memo(Balance);
