import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { RECEIVE_ROUTE, SELECT_ASSET_ROUTE, TRANSACTIONS_ROUTE } from '../../routes/constants';
import Balance from '../../components/balance';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import ModalConfirm from '../../components/modal-confirm';
import ShellPopUp from '../../components/shell-popup';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import { AppContext } from '../../../application/store/context';
import { updateAllAssetsInfo } from '../../../application/store/actions/assets';
import { populateWalletWithFakeTransactions } from '../../../../__test__/_regtest';

const Home: React.FC = () => {
  const [{ assets, app, wallets }, dispatch] = useContext(AppContext);
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
  const handleClick = (assetTicker: string) => {
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: {
        assetTicker,
      },
    });
  };

  // Save mnemonic modal
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);
  const handleSaveMnemonicClose = () => showSaveMnemonicModal(false);
  const handleSaveMnemonicConfirm = () => history.push(RECEIVE_ROUTE);

  // TODO: Show modal conditionnaly base on state
  // blocked by https://github.com/vulpemventures/marina/issues/15
  const handleReceive = () => showSaveMnemonicModal(true);
  const handleSend = () => history.push(SELECT_ASSET_ROUTE);

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
        assetName="Liquid Bitcoin"
        assetTicker="L-BTC"
        quantity={0}
        onClick={() => handleClick('L-BTC')}
      />
    );
  } else {
    // Wallet has coins
    buttonList = Object.entries(assets[app.network.value] || {}).map(([hash, { name, ticker }]) => {
      return (
        <ButtonAsset
          // TODO: fix img paths
          assetImgPath="assets/images/liquid-assets/liquid-btc.svg"
          assetName={name}
          assetTicker={ticker}
          // TODO: fix quantity
          quantity={1}
          key={hash}
          onClick={() => handleClick(ticker)}
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
