import React, { useState } from 'react';
import { connect } from 'react-redux';
import browser from 'webextension-polyfill';
import type { RootReducerState } from '../../domain/common';
import { BACKUP_UNLOCK_ROUTE } from '../routes/constants';
import Button from './button';
import SaveMnemonicModal from './modal-save-mnemonic';

interface ConnectedProps {
  isWalletVerified: boolean;
}

type Props = ConnectedProps & {
  onReceive: () => void;
  onSend: () => void;
};

const ButtonsSendReceive: React.FC<Props> = ({ isWalletVerified, onReceive, onSend }) => {
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);

  const handleSaveMnemonicConfirm = async () => {
    await browser.tabs.create({ url: `home.html#${BACKUP_UNLOCK_ROUTE}` });
  };

  const onReceiveWithVerifiedCheck = () => {
    if (!isWalletVerified) {
      showSaveMnemonicModal(true);
    } else {
      onReceive();
    }
  };

  return (
    <div className="mb-11 mt-7 flex flex-row justify-center space-x-4">
      <Button
        className="flex flex-row items-center justify-center w-2/5"
        onClick={onReceiveWithVerifiedCheck}
      >
        <img className="mr-1" src="assets/images/receive.svg" alt="receive" />
        <span>Receive</span>
      </Button>
      <Button className="flex flex-row items-center justify-center w-2/5" onClick={onSend}>
        <img className="mr-1" src="assets/images/send.svg" alt="send" />
        <span>Send</span>
      </Button>

      <SaveMnemonicModal
        isOpen={isSaveMnemonicModalOpen}
        handleClose={() => showSaveMnemonicModal(false)}
        handleConfirm={handleSaveMnemonicConfirm}
      />
    </div>
  );
};

const mapStateToProps = (state: RootReducerState): ConnectedProps => ({
  isWalletVerified: state.wallet.isVerified,
});

export default connect(mapStateToProps)(ButtonsSendReceive);
