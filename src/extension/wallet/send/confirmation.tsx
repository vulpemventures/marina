import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_CHOOSE_FEE_ROUTE, SEND_END_OF_FLOW_ROUTE } from '../../routes/constants';
import { fromSatoshiStr } from '../../utility';
import AssetIcon from '../../components/assetIcon';
import { Asset } from '../../../domain/asset';
import { assetRepository, sendFlowRepository } from '../../../infrastructure/storage/common';

const Confirmation: React.FC = () => {
  const history = useHistory();
  const handleSend = () => history.push(SEND_END_OF_FLOW_ROUTE);
  const handleBackBtn = () => history.push(SEND_CHOOSE_FEE_ROUTE);
  const [sendAsset, setSendAsset] = useState<Asset>();
  const [recipientAddress, setRecipientAddress] = useState<string>();
  const [sendAmount, setSendAmount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const sendAsset = await sendFlowRepository.getSelectedAsset();
      if (!sendAsset) {
        history.goBack();
        return;
      }

      setSendAsset(await assetRepository.getAsset(sendAsset));

      const sendAddress = await sendFlowRepository.getReceiverAddress();
      if (!sendAddress) {
        history.goBack();
        return;
      }
      setRecipientAddress(sendAddress);

      const sendAmount = await sendFlowRepository.getAmount();
      if (!sendAmount) {
        history.goBack();
        return;
      }
      setSendAmount(sendAmount);
    })();
  }, []);


  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Confirmation"
    >
      <h1 className="text-2xl">{sendAsset?.name}</h1>
      <AssetIcon className="w-11 mt-0.5 block mx-auto mb-2" assetHash={sendAsset?.assetHash ?? ''} />

      <div className="px-3 mt-3">
        <h2 className="text-lg font-medium text-left">To</h2>
        <p className="font-regular text-sm text-left break-all">{recipientAddress}</p>
      </div>

      <div className="bg-gradient-to-r from-secondary to-primary flex flex-row items-center justify-between h-12 px-4 mt-4 rounded-full">
        <span className="text-lg font-medium">Amount</span>
        <span className="text-base font-medium text-white">
          {fromSatoshiStr(sendAmount, sendAsset?.precision)} {sendAsset?.ticker}
        </span>
      </div>

      <Button className="bottom-20 right-8 absolute" onClick={handleSend}>
        Send
      </Button>
    </ShellPopUp>
  );
};

export default Confirmation;
