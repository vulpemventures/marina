import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import {
  RECEIVE_SELECT_ASSET_ROUTE,
  SEND_SELECT_ASSET_ROUTE,
  SEND_ADDRESS_AMOUNT_ROUTE,
  SEND_CHOOSE_FEE_ROUTE,
  SEND_CONFIRMATION_ROUTE,
  TRANSACTIONS_ROUTE,
  LOGIN_ROUTE,
} from '../../routes/constants';
import Balance from '../../components/balance';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import ShellPopUp from '../../components/shell-popup';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import { fromSatoshiWithSpaces } from '../../utility';
import { SendFlowStep } from '../../../domain/repository';
import type { Asset } from 'marina-provider';
import { networks } from 'liquidjs-lib';
import { useStorageContext } from '../../context/storage-context';

const Home: React.FC = () => {
  const history = useHistory();
  const { appRepository, sendFlowRepository, cache } = useStorageContext();
  const [sortedAssets, setSortedAssets] = React.useState<Asset[]>([]);

  useEffect(() => {
    setSortedAssets(
      Array.from(cache?.walletAssets.value || [])
        .map(
          (assetHash) =>
            cache?.assetsDetails.value[assetHash] || {
              name: 'Unknown',
              ticker: assetHash.substring(0, 4),
              precision: 8,
              assetHash,
            }
        )
        .sort((a, b) => {
          if (a.ticker === 'L-BTC') return -Infinity;
          const aBalance = cache?.balances.value[a.assetHash];
          const bBalance = cache?.balances.value[b.assetHash];
          if (aBalance && !bBalance) return -1;
          if (!aBalance && bBalance) return 1;
          return 0;
        })
    );
  }, [cache?.walletAssets, cache?.assetsDetails, cache?.balances, cache?.transactions]);

  const handleAssetBalanceButtonClick = (asset: Asset) => {
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: { assetHash: asset.assetHash },
    });
  };

  const handleReceive = () => {
    history.push(RECEIVE_SELECT_ASSET_ROUTE);
  };

  const handleSend = () => history.push(SEND_SELECT_ASSET_ROUTE);

  useEffect(() => {
    (async () => {
      const { isAuthenticated } = await appRepository.getStatus();
      if (!isAuthenticated) {
        history.push(LOGIN_ROUTE);
        return;
      }

      const step = await sendFlowRepository.getStep();
      switch (step) {
        case SendFlowStep.AssetSelected:
          history.push(SEND_ADDRESS_AMOUNT_ROUTE);
          break;
        case SendFlowStep.AddressAmountFormDone:
          history.push(SEND_CHOOSE_FEE_ROUTE);
          break;
        case SendFlowStep.FeeFormDone:
          history.push(SEND_CONFIRMATION_ROUTE);
          break;
      }
    })().catch(console.error);
  }, [cache?.authenticated]);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      hasBackBtn={false}
    >
      <div className="h-popupContent">
        <div>
          {cache?.network && (
            <Balance
              loading={cache?.balances.loading}
              assetHash={networks[cache?.network].assetHash}
              assetBalance={fromSatoshiWithSpaces(
                cache?.balances.value[networks[cache?.network].assetHash] ?? 0
              )}
              assetTicker="L-BTC"
              bigBalanceText={true}
            />
          )}

          <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />
        </div>

        <br />
        <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5" />

        <div className="h-60">
          <ButtonList
            loadingText={(() => {
              if (cache?.assetsDetails.loading) return 'Loading assets...';
              if (cache?.balances.loading) return 'Loading balances...';
              if (cache?.transactions.loading) return 'Loading transactions...';
              if (cache?.walletAssets.loading) return 'Loading wallet assets...';
            })()}
            loading={
              cache?.transactions.loading ||
              cache?.assetsDetails.loading ||
              cache?.balances.loading ||
              cache?.walletAssets.loading
            }
            title="Assets"
            emptyText="Click receive to deposit asset..."
          >
            {sortedAssets.map((asset: Asset, index: React.Key) => {
              return (
                <ButtonAsset
                  asset={asset}
                  quantity={
                    cache?.balances && !cache.balances.loading
                      ? cache.balances.value[asset.assetHash]
                      : 0
                  }
                  key={index}
                  handleClick={handleAssetBalanceButtonClick}
                />
              );
            })}
          </ButtonList>
        </div>
      </div>
    </ShellPopUp>
  );
};

export default Home;
