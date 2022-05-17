import QRCode from 'qrcode.react';
import { useState } from 'react';
import { isSet } from '../../../application/utils/common';
import Button from '../../components/button';
import { formatAddress } from '../../utils/format';

interface LightningResultViewProps {
  errors: any;
  invoice: string;
  lookingForPayment: boolean;
  txID: string;
}

const LightningResultView = ({
  errors,
  invoice,
  lookingForPayment,
  txID,
}: LightningResultViewProps) => {
  const [buttonText, setButtonText] = useState('Copy');
  const [isInvoiceExpanded, setisInvoiceExpanded] = useState(false);

  const handleExpand = () => setisInvoiceExpanded(!isInvoiceExpanded);
  const handleCopy = () => {
    navigator.clipboard.writeText(invoice).then(
      () => setButtonText('Copied'),
      (err) => console.error('Could not copy text: ', err)
    );
  };

  const Result = ({ text }: { text: string }) => <p className="mb-4 text-xs font-medium">{text}</p>;

  return (
    <div className="w-80 h-96 rounded-4xl flex flex-col items-center justify-between px-10 py-4 mx-auto bg-white">

      {lookingForPayment && !isSet(txID) ? (
        <Result text="⏳  Waiting for payment..." />
      ) : !lookingForPayment && isSet(txID) ? (
        <Result text="✅  Invoice paid!" />
      ) : null}

      {isInvoiceExpanded ? (
        <p className="text-xs font-medium break-all">{invoice}</p>
      ) : (
        <>
          <QRCode size={176} value={invoice.toLowerCase()} />
          <p className="font-regular mt-4 text-lg">{formatAddress(invoice)}</p>
        </>
      )}

      <button
        className="text-xs font-medium text-primary focus:outline-none"
        onClick={handleExpand}
      >
        {isInvoiceExpanded ? 'Show QR code' : 'Expand'}
      </button>

      {isSet(errors.submit) && (
        <p className="text-red mt-1 text-xs font-medium text-left">{errors.submit}</p>
      )}

      <Button className="w-3/5 mt-4" onClick={handleCopy}>
        <span className="text-base antialiased font-bold">{buttonText}</span>
      </Button>
    </div>
  );
};

export default LightningResultView;
