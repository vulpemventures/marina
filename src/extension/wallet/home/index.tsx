import React, { useEffect, useState } from 'react';
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
import type { Asset } from '../../../domain/asset';
import { SendFlowStep } from '../../../infrastructure/repository';
import { computeBalances, getNetwork } from '../../../utils';
import {
  appRepository,
  sendFlowRepository,
  useSelectAllAssets,
  useSelectNetwork,
  useSelectUtxos,
} from '../../../infrastructure/storage/common';

const Home: React.FC = () => {
  const history = useHistory();
  const network = useSelectNetwork();
  const [utxos, utxosLoading] = useSelectUtxos()();
  const allWalletAssets = useSelectAllAssets();
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    console.log('utxos', utxos, utxosLoading);
    if (utxosLoading) return;
    setBalances(computeBalances(utxos));
  }, [utxos]);

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
  }, []);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      hasBackBtn={false}
    >
      <div className="h-popupContent">
        <div>
          {network && (
            <Balance
              assetHash={getNetwork(network).assetHash}
              assetBalance={fromSatoshiStr(balances[getNetwork(network).assetHash] ?? 0)}
              assetTicker="L-BTC"
              bigBalanceText={true}
            />
          )}

          <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />
        </div>

        <br />
        <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5" />

        <div className="h-60">
          {!utxosLoading && <ButtonList title="Assets" emptyText="Click receive to deposit asset...">
            {allWalletAssets
              // put the assets with balance defined on top
              .sort((a, b) => {
                const aBalance = balances[a.assetHash];
                const bBalance = balances[b.assetHash];
                if (aBalance && !bBalance) return -1;
                if (!aBalance && bBalance) return 1;
                return 0;
              })
              .map((asset: Asset, index: React.Key) => {
                return (
                  <ButtonAsset
                    asset={asset}
                    quantity={balances[asset.assetHash]}
                    key={index}
                    handleClick={handleAssetBalanceButtonClick}
                  />
                );
              })}
          </ButtonList>}
        </div>
      </div>
    </ShellPopUp>
  );
};

export default Home;
