import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Button from '../../../components/button';
import ModalConfirm from '../../../components/modal-confirm';
import { RECEIVE_ROUTE } from '../../../routes/constants';

interface Props {
  liquidBitcoinBalance: number;
  fiatBalance: number;
  fiatCurrency: '$' | '€';
}

/**
 * Main top component of home wallet screen
 */
const BalanceSendReceive: React.FC<Props> = ({
  liquidBitcoinBalance,
  fiatBalance,
  fiatCurrency,
}) => {
  //
  let formattedFiatBalance;
  if (fiatCurrency === '$') {
    formattedFiatBalance = `$${fiatBalance} USD`;
  } else if (fiatCurrency === '€') {
    formattedFiatBalance = `${fiatBalance} EUR`;
  }

  // TODO: Show modal conditionnaly base on state
  // blocked by https://github.com/vulpemventures/marina/issues/15
  const history = useHistory();
  const handleReceive = () => showModal(true);

  //
  const [isModalOpen, showModal] = useState(false);
  const handleClose = () => showModal(false);
  const handleConfirm = () => history.push(RECEIVE_ROUTE);

  return (
    <div>
      <img
        className="w-11 mt-0.5 block mx-auto mb-2"
        src="assets/images/liquid-assets/liquid-btc.svg"
        alt="liquid bitcoin logo"
      />
      <div className="mb-7">
        <p className="text-grayDark text-3xl font-medium">{liquidBitcoinBalance} L-BTC</p>
        <p className="text-grayLight text-sm font-medium">{formattedFiatBalance}</p>
      </div>
      <div className="mb-11 flex flex-row justify-center space-x-4">
        <Button className="flex flex-row items-center justify-center w-2/5" onClick={handleReceive}>
          <img className="mr-1" src="assets/images/receive.svg" alt="receive" />
          <span>Receive</span>
        </Button>
        <Button className="flex flex-row items-center justify-center w-2/5">
          <img className="mr-1" src="assets/images/send.svg" alt="send" />
          <span>Send</span>
        </Button>
      </div>
      <ModalConfirm
        btnTextClose="Cancel"
        btnTextConfirm="Save"
        isOpen={isModalOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Save your mnemonic"
      >
        <p className="text-base text-left">Save your mnemonic phrase to receive or send funds</p>
      </ModalConfirm>
    </div>
  );
};

export default BalanceSendReceive;
