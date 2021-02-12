import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
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
import { AppContext } from '../../../application/store/context';
import { setUtxos } from '../../../application/store/actions';
import { xpubWalletFromAddresses } from '../../../application/utils/restorer';
import { flush } from '../../../application/store/actions/transaction';
import { browser } from 'webextension-polyfill-ts';
import { updateAllAssetsInfo } from '../../../application/store/actions/assets';
import { populateWalletWithFakeTransactions } from '../../../../__test__/_regtest';

const Home: React.FC = () => {
  const [{ wallets, app, assets, transaction }, dispatch] = useContext(AppContext);
  const [isAssetInfosLoaded, setAssetInfosLoaded] = useState(false);
  const [assetsData, setAssetsData] = useState({});

  useEffect(() => {
    if (process.env.SKIP_ONBOARDING) {
      dispatch(populateWalletWithFakeTransactions());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wallets[0].utxoMap.size > 0) {
      dispatch(
        updateAllAssetsInfo((assetInfos) => {
          setAssetsData(assetInfos[app.network.value]);
          setAssetInfosLoaded(true);
        })
      );
      // TODO: Extend assets with balances
      //dispatch(
      //getAllBalances(
      //(assetBalances) => {
      // setAssetsData({ ...assetsData, ...assetBalances });
      // },
      // (error) => console.log(error)
      //);
    } else {
      setAssetInfosLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets]);

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

  const handleClick = ({ assetTicker }: { [key: string]: string }) => {
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: { assetTicker },
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

  if (isFetchingUtxos) {
    return <>Loading...</>;
  }

  // Generate ButtonList
  let buttonList;
  if (Object.entries(assets[app.network.value] || {}).length === 0 && !isAssetInfosLoaded) {
    // Loading
    // TODO: replace with a nice spinner
    buttonList = <p className="h-72">Loading...</p>;
  } else if (Object.entries(assets[app.network.value]).length === 0 && isAssetInfosLoaded) {
    // Wallet is empty
    buttonList = (
      <ButtonAsset
        assetImgPath="assets/images/liquid-assets/liquid-btc.svg"
        assetHash="6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d"
        assetName="Liquid Bitcoin"
        assetTicker="L-BTC"
        quantity={0}
        handleClick={handleClick}
      />
    );
  } else {
    // Wallet has coins
    buttonList = Object.entries(assets[app.network.value] || {}).map(([hash, { name, ticker }]) => {
      let imgPath: string;
      switch (ticker) {
        case 'L-BTC':
          imgPath = 'assets/images/liquid-assets/liquid-btc.svg';
          break;
        case 'LCAD':
          imgPath = 'assets/images/liquid-assets/liquid-cad.png';
          break;
        case 'USDt':
          imgPath = 'assets/images/liquid-assets/liquid-tether.png';
          break;
        default:
          imgPath = 'assets/images/liquid-assets/question-mark.svg';
          break;
      }

      return (
        <ButtonAsset
          // TODO: fix img paths
          assetImgPath="assets/images/liquid-assets/liquid-btc.svg"
          assetHash={hash}
          assetName={name}
          assetTicker={ticker}
          // TODO: fix quantity
          quantity={1}
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
        bigBalanceText={true}
        liquidBitcoinBalance={0.005}
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
