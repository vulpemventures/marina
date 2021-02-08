import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { ErrorBoundary } from 'react-error-boundary';
import {
  RECEIVE_ROUTE,
  SELECT_ASSET_ROUTE,
  SEND_CONFIRMATION_ROUTE,
  TRANSACTIONS_ROUTE,
} from '../../routes/constants';
import Balance from '../../components/balance';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import ErrorFallback from '../../components/error-fallback';
import ModalConfirm from '../../components/modal-confirm';
import ShellPopUp from '../../components/shell-popup';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import assets from '../../../../__test__/fixtures/assets.json';
import { AppContext } from '../../../application/store/context';
import { setUtxos } from '../../../application/store/actions';
import { xpubWalletFromAddresses } from '../../../application/utils/restorer';

const Home: React.FC = () => {
  const [{ wallets, app }, dispatch] = useContext(AppContext);
  const history = useHistory();
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);
  const [isFetchingUtxos, setIsFetchingUtxos] = useState<boolean>(true);
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

      <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5"></div>

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ButtonList title="Assets" type="assets">
          {assets.map((asset, i) => {
            let imgPath: string;
            switch (asset.assetTicker) {
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
                key={i}
                assetImgPath={imgPath}
                assetHash={asset.assetHash}
                assetName={asset.assetName}
                assetTicker={asset.assetTicker}
                quantity={asset.quantity}
                onClick={handleClick}
              />
            );
          })}
        </ButtonList>
      </ErrorBoundary>

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
