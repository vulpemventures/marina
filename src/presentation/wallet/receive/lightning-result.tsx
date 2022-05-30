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

  const ShowResult = () =>
    lookingForPayment && !isSet(txID) ? (
      <p className="mb-4 text-xs font-medium whitespace-pre">⏳ Waiting for payment...</p>
    ) : !lookingForPayment && isSet(txID) ? (
      <p className="my-auto text-xs font-medium whitespace-pre">✅ Invoice paid!</p>
    ) : null;

  const AuxiliarButton = ({ children }: { children: React.ReactNode }) => (
    <button className="text-primary focus:outline-none text-xs font-medium" onClick={handleExpand}>
      {children}
    </button>
  );

  const ShowQrcode = () =>
    lookingForPayment && !isInvoiceExpanded ? (
      <>
        <QRCode size={176} value={invoice.toLowerCase()} />
        <p className="font-regular mt-4 text-lg">{formatAddress(invoice)}</p>
        <AuxiliarButton>Expand</AuxiliarButton>
      </>
    ) : null;

  const ShowExpanded = () =>
    lookingForPayment && isInvoiceExpanded ? (
      <>
        <p className="text-xs font-medium break-all">{invoice}</p>
        <AuxiliarButton>Show QR Code</AuxiliarButton>
      </>
    ) : null;

  const ShowErrors = () =>
    isSet(errors.submit) ? (
      <p className="text-red mt-1 text-xs font-medium text-left">{errors.submit}</p>
    ) : null;

  const ShowCopyButton = () =>
    lookingForPayment ? (
      <Button className="w-3/5 mt-4" onClick={handleCopy}>
        <span className="text-base antialiased font-bold">{buttonText}</span>
      </Button>
    ) : null;

  return (
    <div className="w-80 h-96 rounded-4xl flex flex-col items-center justify-between px-10 py-4 mx-auto bg-white">
      <ShowResult />
      <ShowQrcode />
      <ShowExpanded />
      <ShowErrors />
      <ShowCopyButton />
    </div>
  );
};

export default LightningResultView;
