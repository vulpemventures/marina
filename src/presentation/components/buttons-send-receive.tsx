import React from 'react';
import Button from './button';

interface Props {
  onReceive: () => void;
  onSend: () => void;
}

const ButtonsSendReceive: React.FC<Props> = ({ onReceive, onSend }) => {
  return (
    <div className="mb-11 mt-7 flex flex-row justify-center space-x-4">
      <Button className="flex flex-row items-center justify-center w-2/5" onClick={onReceive}>
        <img className="mr-1" src="assets/images/receive.svg" alt="receive" />
        <span>Receive</span>
      </Button>
      <Button className="flex flex-row items-center justify-center w-2/5" onClick={onSend}>
        <img className="mr-1" src="assets/images/send.svg" alt="send" />
        <span>Send</span>
      </Button>
    </div>
  );
};

export default ButtonsSendReceive;
