import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import Balance from '../../components/balance';
import ShellPopUp from '../../components/shell-popup';
import { fromSatoshi } from '../../utility';
import { DEFAULT_ROUTE } from '../../routes/constants';
import type { Asset } from '../../../domain/asset';
import AddressAmountForm from '../../components/address-amount-form';
import { MainAccountName } from '../../../domain/account-type';
import {
  assetRepository,
  sendFlowRepository,
  useSelectNetwork,
  useSelectUtxos,
} from '../../../infrastructure/storage/common';
import { computeBalances } from '../../../utils';

const AddressAmountView: React.FC = () => {
  const history = useHistory();
  const network = useSelectNetwork();
  const utxos = useSelectUtxos(MainAccountName)();
  const [dataInCache, setDataInCache] = useState<{ amount?: number; address?: string }>();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [sendAsset, setSendAsset] = useState<Asset>();

  useEffect(() => {
    setBalances(computeBalances(utxos));
  }, [utxos]);

  useEffect(() => {
    (async () => {
      const asset = await sendFlowRepository.getSelectedAsset();
      if (!asset) throw new Error('No asset selected, cannot proceed');
      const transactionAsset = await assetRepository.getAsset(asset);
      if (!transactionAsset) throw new Error('No asset found, cannot proceed');
      setSendAsset(transactionAsset);
      const amount = await sendFlowRepository.getAmount();
      const address = await sendFlowRepository.getReceiverAddress();
      setDataInCache({ amount, address });
    })().catch(console.error);
  }, []);

  const handleBackBtn = async () => {
    await sendFlowRepository.reset();
    history.replace(DEFAULT_ROUTE);
  };

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      {sendAsset && balances[sendAsset.assetHash] && (
        <>
          <Balance
            assetHash={sendAsset.assetHash}
            assetBalance={fromSatoshi(balances[sendAsset.assetHash] ?? 0, sendAsset.precision)}
            assetTicker={sendAsset.ticker}
            className="mt-4"
          />

          {network && (
            <AddressAmountForm
              history={history}
              maxPossibleAmount={balances[sendAsset.assetHash] ?? 0}
              network={network}
              dataInCache={{
                amount: 0,
                address: '',
                ...dataInCache,
              }}
              asset={sendAsset}
              sendFlowRepository={sendFlowRepository}
            />
          )}
        </>
      )}
    </ShellPopUp>
  );
};

export default AddressAmountView;
