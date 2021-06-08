import React, { useState } from 'react';
import { EsploraIdentityRestorer, IdentityType, MasterPublicKey } from 'ldk';
import { useDispatch, useSelector } from 'react-redux';
import { changeNetwork } from '../../application/redux/actions/app';
import { updateTxs } from '../../application/redux/actions/transaction';
import { updateUtxos } from '../../application/redux/actions/utxos';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { explorerApiUrl } from '../../application/utils';
import { RootReducerState } from '../../domain/common';
import { createNetwork } from '../../domain/network';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { formatNetwork } from '../utils';
import { setWalletData } from '../../application/redux/actions/wallet';
import { createAddress } from '../../domain/address';

const networks = ['liquid', 'regtest'];
const formattedNetworks = networks.map((n) => formatNetwork(n));

const SettingsNetworks: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string>();
  const [error, setError] = useState<any>();

  const network = useSelector((state: RootReducerState) => state.app.network);
  const wallet = useSelector((state: RootReducerState) => state.wallet);
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const selectedNetwork = formatNetwork(network);

  const setSelectedValue = async (net: string) => {
    setIsLoading(true);
    try {
      const newNetwork = createNetwork(net.toLowerCase());
      await dispatch(changeNetwork(newNetwork));
      setLoadingMsg('re-creating your master public key');
      const restorer = new EsploraIdentityRestorer(explorerApiUrl[newNetwork]);
      const pubKey = new MasterPublicKey({
        chain: newNetwork,
        restorer,
        type: IdentityType.MasterPublicKey,
        value: {
          masterPublicKey: wallet.masterXPub,
          masterBlindingKey: wallet.masterBlindingKey,
        },
        initializeFromRestorer: true,
      });

      setLoadingMsg('restoring your wallet');
      await pubKey.isRestored;
      const restoredAddresses = await pubKey.getAddresses();
      console.log(restoredAddresses);
      setLoadingMsg('updating wallet data');
      await dispatch(
        setWalletData({
          confidentialAddresses: restoredAddresses.map((a) =>
            createAddress(a.confidentialAddress, a.derivationPath)
          ),
          encryptedMnemonic: wallet.encryptedMnemonic,
          masterBlindingKey: wallet.masterBlindingKey,
          masterXPub: wallet.masterXPub,
          passwordHash: wallet.passwordHash,
        })
      );

      setLoadingMsg('fetching transactions');
      await dispatch(updateTxs()).catch(console.error);
      setLoadingMsg('fetching utxos');
      await dispatch(updateUtxos()).catch(console.error);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Networks"
    >
      <p className="font-regular my-8 text-base text-left">Select the network</p>
      <Select
        disabled={isLoading}
        data={formattedNetworks}
        selectedValue={selectedNetwork}
        setSelectedValue={setSelectedValue}
      />

      {isLoading && <p className="m-2">{loadingMsg || 'loading'}...</p>}
      {error && <p className="m-2">{error}</p>}
    </ShellPopUp>
  );
};

export default SettingsNetworks;
