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
import { fromSatoshiStr } from '../../utility';
import { SendFlowStep } from '../../../domain/repository';
import type { Asset } from 'marina-provider';
import { networks } from 'liquidjs-lib';
import { useStorageContext } from '../../context/storage-context';

const Home: React.FC = () => {
  const history = useHistory();
  const { sendFlowRepository, cache } = useStorageContext();

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
      if (!cache) return;

      if (!cache.authenticated && !cache.loading) {
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
              assetHash={networks[cache?.network].assetHash}
              assetBalance={fromSatoshiStr(
                cache?.balances[networks[cache?.network].assetHash] ?? 0
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
          <ButtonList title="Assets" emptyText="Click receive to deposit asset...">
            {cache?.assets
              // put the assets with balance defined on top
              .sort((a, b) => {
                const aBalance = cache?.balances[a.assetHash];
                const bBalance = cache?.balances[b.assetHash];
                if (aBalance && !bBalance) return -1;
                if (!aBalance && bBalance) return 1;
                return 0;
              })
              .map((asset: Asset, index: React.Key) => {
                return (
                  <ButtonAsset
                    asset={asset}
                    quantity={cache?.balances[asset.assetHash] || 0}
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
