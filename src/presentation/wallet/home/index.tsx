import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { browser } from 'webextension-polyfill-ts';
import {
  RECEIVE_ROUTE,
  SELECT_ASSET_ROUTE,
  SEND_CONFIRMATION_ROUTE,
  TRANSACTIONS_ROUTE,
} from '../../routes/constants';
import Balance from '../../components/balance';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import ModalConfirm from '../../components/modal-confirm';
import ShellPopUp from '../../components/shell-popup';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import useLottieLoader from '../../hooks/use-lottie-loader';
import { AppContext } from '../../../application/store/context';
import {
  flush,
  setUtxos,
  getAllAssetBalances,
  updateAllAssetInfos,
} from '../../../application/store/actions';
import { xpubWalletFromAddresses } from '../../../application/utils/restorer';
import { createDevState } from '../../../../__test__/dev-state';
import {
  imgPathMapMainnet,
  imgPathMapRegtest,
  lbtcAssetByNetwork,
} from '../../../application/utils';

const Home: React.FC = () => {
  const [{ wallets, app, assets, transaction }, dispatch] = useContext(AppContext);
  const [isAssetDataLoaded, setAssetDataLoaded] = useState(false);
  const [assetsBalance, setAssetsBalance] = useState<{ [hash: string]: number }>({});

  // Populate ref div with svg animation
  const marinaLoaderRef = React.useRef(null);
  useLottieLoader(marinaLoaderRef);

  useEffect(() => {
    if (process.env.SKIP_ONBOARDING) {
      dispatch(createDevState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wallets[0].utxoMap.size > 0) {
      dispatch(
        updateAllAssetInfos(() => {
          dispatch(
            getAllAssetBalances(
              (balances) => {
                setAssetsBalance(balances);
                setAssetDataLoaded(true);
              },
              (error) => console.log(error)
            )
          );
        })
      );
    } else {
      setAssetDataLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.network.value, wallets]);

  const history = useHistory();
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);
  const [isFetchingUtxos, setIsFetchingUtxos] = useState<boolean>(!wallets[0].pendingTx);
  const wallet = wallets[0];

  useEffect(() => {
    void (async (): Promise<void> => {
      if (isFetchingUtxos) {
        const w = await xpubWalletFromAddresses(
          wallet.masterXPub.value,
          wallet.masterBlindingKey.value,
          wallet.confidentialAddresses,
          app.network.value
        );

        dispatch(
          setUtxos(
            w.getAddresses(),
            () => {
              if (transaction.asset !== '') {
                dispatch(flush());
                browser.browserAction.setBadgeText({ text: '' }).catch((ignore) => ({}));
              }
              setIsFetchingUtxos(false);
            },
            (err: Error) => {
              console.log(err);
            }
          )
        );
      }
    })();
  });

  if (wallets[0].pendingTx) {
    history.push(SEND_CONFIRMATION_ROUTE);
    return <></>;
  }

  const handleClick = (asset: { [key: string]: string }) => {
    const { assetHash, assetTicker } = asset;
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: { assetHash, assetTicker },
    });
  };

  // Save mnemonic modal
  const handleSaveMnemonicClose = () => {
    showSaveMnemonicModal(false);
  };
  const handleSaveMnemonicConfirm = () => history.push(RECEIVE_ROUTE);

  // TODO: Show modal conditionnaly base on state
  // blocked by https://github.com/vulpemventures/marina/issues/15
  const handleReceive = () => showSaveMnemonicModal(true);
  const handleSend = () => history.push(SELECT_ASSET_ROUTE);

  // Lottie mermaid animation
  if (
    isFetchingUtxos ||
    (Object.keys(assets[app.network.value] || {}).length === 0 && !isAssetDataLoaded)
  ) {
    return (
      <div
        className="flex items-center justify-center h-screen p-8"
        id="marina-loader"
        ref={marinaLoaderRef}
      />
    );
  }

  // Generate ButtonList
  let buttonList;
  if (Object.entries(assets[app.network.value]).length === 0 && isAssetDataLoaded) {
    // Wallet is empty
    buttonList = (
      <ButtonAsset
        assetImgPath="assets/images/liquid-assets/liquid-btc.svg"
        assetHash={lbtcAssetByNetwork(app.network.value)}
        assetName="Liquid Bitcoin"
        assetTicker="L-BTC"
        quantity={0}
        handleClick={handleClick}
      />
    );
  } else {
    // Wallet has coins
    buttonList = Object.entries(assets[app.network.value] || {}).map(([hash, { name, ticker }]) => {
      return (
        <ButtonAsset
          assetImgPath={
            app.network.value === 'regtest'
              ? imgPathMapRegtest[ticker] ?? imgPathMapRegtest['']
              : imgPathMapMainnet[hash] ?? imgPathMapMainnet['']
          }
          assetHash={hash}
          assetName={name}
          assetTicker={ticker}
          quantity={(assetsBalance[hash] ?? 0) / Math.pow(10, 8)}
          key={hash}
          handleClick={handleClick}
        />
      );
    });
  }

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      hasBackBtn={false}
    >
      <Balance
        assetBalance={(assetsBalance[lbtcAssetByNetwork(app.network.value)] ?? 0) / Math.pow(10, 8)}
        assetImgPath="assets/images/liquid-assets/liquid-btc.svg"
        assetTicker="L-BTC"
        bigBalanceText={true}
        fiatBalance={120}
        fiatCurrency="$"
      />

      <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />

      <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5" />

      <ButtonList title="Assets" type="assets">
        {buttonList}
      </ButtonList>

      <ModalConfirm
        btnTextClose="Cancel"
        btnTextConfirm="Save"
        isOpen={isSaveMnemonicModalOpen}
        onClose={handleSaveMnemonicClose}
        onConfirm={handleSaveMnemonicConfirm}
        title="Save your mnemonic"
      >
        <p className="text-base text-left">Save your mnemonic phrase to receive or send funds</p>
      </ModalConfirm>
    </ShellPopUp>
  );
};

export default Home;
