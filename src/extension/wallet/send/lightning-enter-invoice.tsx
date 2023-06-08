import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import Button from '../../components/button';
import { SEND_CHOOSE_FEE_ROUTE } from '../../routes/constants';
import type { NetworkString } from 'marina-provider';
import { fromSatoshi } from '../../utility';
import { AccountFactory, MainAccount, MainAccountTest } from '../../../application/account';
import { useStorageContext } from '../../context/storage-context';
import {
  createSubmarineSwap,
  DEFAULT_LIGHTNING_LIMITS,
  getInvoiceValue,
} from '../../../application/boltz/utils';
import Boltz from '../../../application/boltz';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';

export interface LightningInvoiceProps {
  lbtcBalance: number;
  network: NetworkString;
}

const LightningInvoice: React.FC<LightningInvoiceProps> = ({ lbtcBalance, network }) => {
  const history = useHistory();
  const { sendFlowRepository, walletRepository } = useStorageContext();
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limits, setLimits] = useState(DEFAULT_LIGHTNING_LIMITS);
  const [touched, setTouched] = useState(false);
  const [value, setValue] = useState(0);

  const boltz = new Boltz(network);

  // get maximal and minimal amount for pair
  useEffect(() => {
    const fetchData = async () => {
      const pair = await boltz.getPair('L-BTC/BTC');
      if (pair?.limits) {
        setLimits({
          maximal: fromSatoshi(pair.limits.maximal),
          minimal: fromSatoshi(pair.limits.minimal),
        });
      }
    };
    fetchData().catch(console.error);
  }, []);

  const handleBackBtn = () => history.goBack();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    setError('');
    setTouched(true);

    const invoice = event.target.value;

    if (!invoice) {
      setTouched(false);
      setValue(0);
      return;
    }

    try {
      // get value from invoice
      const value = getInvoiceValue(invoice);
      setValue(value);

      // validate value
      if (Number.isNaN(value)) setError('Invalid value');
      if (value <= 0) setError('Value must be positive');
      if (value < limits.minimal) setError(`Value must be higher then ${limits.minimal}`);
      if (value > limits.maximal) setError(`Value must be lower then ${limits.maximal}`);
      if (value > fromSatoshi(lbtcBalance)) setError('Insufficient funds');
      if (error) return;

      setInvoice(invoice);
    } catch (_) {
      setError('Invalid invoice');
    }
  };

  const handleProceed = async () => {
    setIsSubmitting(true);

    // get account
    const accountFactory = await AccountFactory.create(walletRepository);
    const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
    const mainAccount = await accountFactory.make(network, accountName);

    // get refund pub key and change address
    const refundAddress = await mainAccount.getNextAddress(false);
    console.log('refundAddress', refundAddress);
    const accountDetails = Object.values(await walletRepository.getAccountDetails(accountName))[0];
    const refundPublicKey = BIP32Factory(ecc)
      .fromBase58(accountDetails.masterXPub)
      .derivePath(refundAddress.derivationPath?.replace('m/', '') ?? '')
      .publicKey.toString('hex');
    // const changeAddress = await mainAccount.getNextAddress(true); // TODO: do we need that?

    try {
      // create submarine swap
      const { address, expectedAmount } = await createSubmarineSwap(
        invoice,
        network,
        refundPublicKey
      );

      // push to store payment to be made
      await sendFlowRepository.setReceiverAddressAmount(address, expectedAmount);

      // go to choose fee route
      history.push(SEND_CHOOSE_FEE_ROUTE);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
      return;
    }
  };

  const isButtonDisabled = () => Boolean(!invoice || error || isSubmitting);

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent bg-primary flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Send⚡️"
    >
      <div className="w-full h-full p-10 bg-white">
        <form className="mt-10">
          <div>
            <label className="block">
              <p className="mb-2 text-base font-medium text-left">Invoice</p>
              <div
                className={cx('focus-within:text-grayDark text-grayLight relative w-full', {
                  'text-grayDark': touched,
                })}
              >
                <input
                  className={cx(
                    'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-full rounded-md',
                    {
                      'border-red': error && touched,
                      'border-grayLight': !error || touched,
                    }
                  )}
                  id="invoice"
                  name="invoice"
                  onChange={handleChange}
                  type="text"
                />
              </div>
            </label>
          </div>
          {error && touched && (
            <p className="text-red mt-1 text-xs font-medium text-left">{error}</p>
          )}
          {value > 0 && touched && (
            <p className="mt-1 text-xs font-medium text-left">Value {value} BTC</p>
          )}
          <div className="text-right">
            <Button
              className="w-3/5 mt-6 text-base"
              disabled={isButtonDisabled()}
              onClick={handleProceed}
            >
              Proceed
            </Button>
          </div>
        </form>
      </div>
    </ShellPopUp>
  );
};

export default LightningInvoice;
