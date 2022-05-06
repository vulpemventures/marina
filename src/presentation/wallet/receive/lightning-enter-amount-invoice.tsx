import QRCode from 'qrcode.react';
import { randomBytes } from 'crypto';
import React, {useState} from 'react';
import { useHistory } from 'react-router';
import { crypto } from 'liquidjs-lib';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import { NetworkString } from 'ldk';
import Button from '../../components/button';
import Boltz, { ReverseSubmarineSwapRequest, ReverseSubmarineSwapResponse } from '../../../application/utils/boltz';
import { DEFAULT_ROUTE } from '../../routes/constants';
import { formatAddress } from '../../utils/format';

export interface LightningAmountInvoiceProps {
  network: NetworkString;
}

const isSet = (value: string) => {
  return value.length > 0
};

const LightningAmountInvoiceView: React.FC<LightningAmountInvoiceProps> = ({
  network,
}) => {
  const history = useHistory();

  const [values, setValues] = useState({ amount: ''});
  const [errors, setErrors] = useState({ amount: ''});
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [invoice, setInvoice] = useState('');


  const [buttonText, setButtonText] = useState('Copy');
  const [isInvoiceExpanded, setisInvoiceExpanded] = useState(false);
  const handleExpand = () => setisInvoiceExpanded(true);
  const handleBackBtn = () => history.replace(DEFAULT_ROUTE);
  const handleCopy = () => {
    navigator.clipboard.writeText(invoice).then(
      () => setButtonText('Copied'),
      (err) => console.error('Could not copy text: ', err)
    );
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    setTouched(true)

    const { target : { value } } = event; 

    if (!isSet(value)) {
      setTouched(false);
      setErrors({ amount: '' });
      setValues({ amount: value });
      return;
    }

    if (Number.isNaN(value)) {
      setErrors({ amount: 'Not valid number' });
      setValues({ amount: value });
      return;
    }

    if (Number(value) <= 0) {
      setErrors({ amount: 'Number must be positive' });
      setValues({ amount: value });
      return;
    }

    setErrors({ amount: '' });
    setValues({ amount: value });
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // disable Generate button
    setIsSubmitting(true);



    try {    

      const preimage = randomBytes(32);
      const preimageHash = crypto.sha256(preimage).toString('hex');
      const boltz = new Boltz(network);
    
      const response: ReverseSubmarineSwapResponse = await boltz.createReverseSubmarineSwap({
        invoiceAmount: Number(values.amount),
        preimageHash: preimageHash,
        claimPublicKey: '0277e2e4e272e9b6cbe7728a11ff75c1868f512c5ec5aae440949d774cd259f6c8'
      });

      setInvoice(response.invoice);


    } catch(err: any) {
      console.error(err);
    }
  }

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      {
      
      isSet(invoice) ? (
         <div className="w-80 h-96 rounded-4xl flex flex-col items-center justify-between p-10 bg-white">
         <div className="flex flex-col items-center">
           {invoice ? (
             <QRCode size={176} value={invoice.toLowerCase()} />
           ) : (
             <div className="w-44 h-44" />
           )}
           {isInvoiceExpanded ? (
             <p className="mt-2.5 text-xs font-medium break-all">{invoice}</p>
           ) : (
             <>
               <p className="font-regular mt-2.5 text-lg">{formatAddress(invoice)}</p>
               <button
                 className="mt-1.5 text-xs font-medium text-primary focus:outline-none"
                 onClick={handleExpand}
               >
                 Expand
               </button>
             </>
           )}
         </div>
         <Button className="w-3/5" onClick={handleCopy}>
           <span className="text-base antialiased font-bold">{buttonText}</span>
         </Button>
       </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10">
        <div className={cx({ 'mb-12': !isSet(errors.amount) || touched })}>
          <label className="block">
            <p className="mb-2 text-base font-medium text-left">Amount</p>
            <div
              className={cx('focus-within:text-grayDark text-grayLight relative w-full', {
                'text-grayDark': touched,
              })}
            >
              <input
                className={cx(
                  'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-full rounded-md',
                  {
                    'border-red': isSet(errors.amount) && touched,
                    'border-grayLight': !isSet(errors.amount) || touched,
                  }
                )}
                id="amount"
                name="amount"
                onChange={handleChange}
                placeholder="0"
                type="number"
                lang="en"
                value={values.amount}
              />
            </div>
          </label>
          {isSet(errors.amount) && touched && (
            <p className="text-red h-10 mt-1 text-xs font-medium text-left">{errors.amount}</p>
          )}
        </div>
  
        <div className="text-right">
          <Button
            className="w-2/5 -mt-2 text-base"
            disabled={
              isSubmitting || (isSet(errors.amount) && touched) || !touched
            }
            type="submit"
          >
            Generate
          </Button>
        </div>
      </form>
      )}
   
    </ShellPopUp>
  );
};

export default LightningAmountInvoiceView;
