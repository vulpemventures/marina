import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import Balance from '../../components/balance';
import ShellPopUp from '../../components/shell-popup';
import { fromSatoshiWithSpaces } from '../../utility';
import { DEFAULT_ROUTE } from '../../routes/constants';
import AddressAmountForm from '../../components/address-amount-form';
import type { Asset } from 'marina-provider';
import { useStorageContext } from '../../context/storage-context';

const AddressAmountView: React.FC = () => {
  const history = useHistory();
  const { sendFlowRepository, assetRepository, cache } = useStorageContext();
  const [dataInCache, setDataInCache] = useState<{ amount?: number; address?: string }>();
  const [sendAsset, setSendAsset] = useState<Asset>();
  const [isInitializingFormState, setIsInitializingFormState] = useState(true);

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
    })()
      .catch(console.error)
      .finally(() => setIsInitializingFormState(false));
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
      {!isInitializingFormState && sendAsset && cache?.balances.value[sendAsset.assetHash] && (
        <>
          <Balance
            assetHash={sendAsset.assetHash}
            assetBalance={fromSatoshiWithSpaces(
              cache?.balances.value[sendAsset.assetHash] ?? 0,
              sendAsset.precision
            )}
            assetTicker={sendAsset.ticker}
            className="mt-4"
          />

          {cache?.network && (
            <AddressAmountForm
              history={history}
              maxPossibleAmount={cache?.balances.value[sendAsset.assetHash] ?? 0}
              network={cache.network}
              dataInCache={{ ...dataInCache }}
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
