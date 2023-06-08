import QRCode from 'qrcode.react';
import { useState } from 'react';
import Button from '../../components/button';
import { formatAddress } from '../../utility';

interface LightningShowInvoiceViewProps {
  errors: any;
  invoice: string;
}

const LightningShowInvoice = ({ errors, invoice }: LightningShowInvoiceViewProps) => {
  const [buttonText, setButtonText] = useState('Copy');
  const [isInvoiceExpanded, setisInvoiceExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(invoice).then(
      () => setButtonText('Copied'),
      (err) => console.error('Could not copy text: ', err)
    );
  };

  const AuxiliarButton = ({ children }: { children: React.ReactNode }) => (
    <button
      className="text-primary focus:outline-none text-xs font-medium"
      onClick={() => setisInvoiceExpanded(!isInvoiceExpanded)}
    >
      {children}
    </button>
  );

  return (
    <div className="w-80 h-96 rounded-4xl flex flex-col items-center justify-between px-10 py-4 mx-auto bg-white">
      <p className="mb-4 text-xs font-medium whitespace-pre">⏳ Waiting for payment...</p>
      {isInvoiceExpanded ? (
        <>
          <p className="text-xs font-medium break-all">{invoice}</p>
          <AuxiliarButton>Show QR Code</AuxiliarButton>
        </>
      ) : (
        <>
          <QRCode size={176} value={invoice.toLowerCase()} />
          <p className="font-regular mt-4 text-lg">{formatAddress(invoice)}</p>
          <AuxiliarButton>Expand</AuxiliarButton>
        </>
      )}
      {errors.submit && (
        <p className="text-red mt-1 text-xs font-medium text-left">{errors.submit}</p>
      )}
      <Button className="w-3/5 mt-4" onClick={handleCopy}>
        <span className="text-base antialiased font-bold">{buttonText}</span>
      </Button>
    </div>
  );
};

export default LightningShowInvoice;
