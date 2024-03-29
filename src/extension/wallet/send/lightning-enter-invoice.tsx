import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import Button from '../../components/button';
import { SEND_CHOOSE_FEE_ROUTE } from '../../routes/constants';
import { networks } from 'liquidjs-lib';
import { fromSatoshi, toSatoshi } from '../../utility';
import { AccountFactory, MainAccount, MainAccountTest } from '../../../application/account';
import { useStorageContext } from '../../context/storage-context';
import type { BoltzPair, SubmarineSwap } from '../../../pkg/boltz';
import { Boltz, boltzUrl } from '../../../pkg/boltz';
import zkp from '@vulpemventures/secp256k1-zkp';
import { Spinner } from '../../components/spinner';
import { addressFromScript } from '../../utility/address';

const zkpLib = await zkp();

const LightningInvoice: React.FC = () => {
  const history = useHistory();
  const { cache, sendFlowRepository, refundableSwapsRepository, walletRepository } =
    useStorageContext();
  const [swapFees, setSwapFees] = useState(0);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pair, setPair] = useState<BoltzPair>();
  const [touched, setTouched] = useState(false);
  const [value, setValue] = useState(0);
  const [warning, setWarning] = useState('');

  const network = cache?.network ?? 'liquid';
  const boltz = new Boltz(boltzUrl[network], networks[network].assetHash, zkpLib);

  void sendFlowRepository.setLightning(true);

  // get maximal and minimal amount for pair
  useEffect(() => {
    const fetchData = async () => {
      const _pair = await boltz.getBoltzPair('L-BTC/BTC');
      if (_pair) setPair(_pair);
    };
    fetchData().catch(console.error);
  }, []);

  const makeSwap = async (): Promise<SubmarineSwap | undefined> => {
    try {
      // get account
      const accountFactory = await AccountFactory.create(walletRepository);
      const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
      const mainAccount = await accountFactory.make(network, accountName);

      // get refund pub key and change address
      const refundAddress = await mainAccount.getNextAddress(false);
      const refundPublicKey = refundAddress.publicKey;

      // create submarine swap
      const swap = await boltz.createSubmarineSwap(invoice, network, refundPublicKey);
      const { address, blindingKey, expectedAmount, id, redeemScript } = swap;

      // calculate funding address (used for refunding case the swap fails)
      const fundingAddress = addressFromScript(redeemScript, network);

      const expirationDate = boltz.getInvoiceExpireDate(invoice);

      // save swap params to storage
      await refundableSwapsRepository.addSwap({
        blindingKey,
        confidentialAddress: address,
        expectedAmount,
        expirationDate,
        id,
        invoice,
        fundingAddress,
        redeemScript,
        refundPublicKey,
        network,
      });

      return swap;
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleBackBtn = () => history.goBack();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    setError('');
    setWarning('');
    setTouched(true);

    if (!pair) return;

    const invoice = event.target.value;

    if (!invoice) {
      setTouched(false);
      setValue(0);
      return;
    }

    const lbtcBalance = cache?.balances.value[networks[network].assetHash] ?? 0;

    try {
      // get value from invoice
      const value = boltz.getInvoiceValue(invoice);
      const valueInSats = toSatoshi(value);
      const fees = boltz.calcBoltzFees(pair, valueInSats);
      const expirationDate = boltz.getInvoiceExpireDate(invoice);

      setSwapFees(fees);
      setValue(value);

      const { minimal, maximal } = pair.limits;

      // validate date
      if (Date.now() > expirationDate) return setError('Expired invoice');

      // validate value
      if (Number.isNaN(value)) return setError('Invalid value');
      if (valueInSats <= 0) return setError('Value must be positive');
      if (valueInSats < minimal) return setError(`Value must be higher or equal then ${minimal}`);
      if (valueInSats > maximal) return setError(`Value must be lower or equal then ${maximal}`);
      if (valueInSats + fees > lbtcBalance) return setError('Insufficient funds to pay swap fee');
      if (valueInSats > lbtcBalance) return setError('Insufficient funds');

      if (valueInSats + fees + 300 > lbtcBalance)
        setWarning('You may not have enough funds to pay swap');

      setInvoice(invoice);
    } catch (_) {
      setError('Invalid invoice');
    }
  };

  const handleProceed = async () => {
    setIsSubmitting(true);

    // check if we have a swap already made for this invoice
    const swapOnCache = await refundableSwapsRepository.findSwapWithInvoice(invoice);

    if (swapOnCache?.confidentialAddress && swapOnCache.expectedAmount) {
      await sendFlowRepository.setReceiverAddressAmount(
        swapOnCache?.confidentialAddress,
        swapOnCache.expectedAmount
      );
    } else {
      const swap = await makeSwap();
      if (!swap) return;
      const { address, expectedAmount } = swap;
      await sendFlowRepository.setReceiverAddressAmount(address, expectedAmount);
    }

    // go to choose fee route
    history.push(SEND_CHOOSE_FEE_ROUTE);
  };

  const isButtonDisabled = () => Boolean(!invoice || error || isSubmitting);

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent bg-primary flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Send⚡️"
    >
      {!pair?.limits.minimal ? (
        <Spinner color="#fefefe" />
      ) : (
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
            {value > 0 && touched && (
              <p className="mt-1 text-xs font-medium text-left">Invoice value {value} BTC</p>
            )}
            {swapFees > 0 && touched && (
              <p className="mt-1 text-xs font-medium text-left">
                Swap fee {fromSatoshi(swapFees)} L-BTC
              </p>
            )}
            {error && touched && (
              <p className="text-red mt-1 text-xs font-medium text-left">{error}</p>
            )}
            {warning && touched && (
              <p className="text-red mt-1 text-xs font-medium text-left">{warning}</p>
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
      )}
    </ShellPopUp>
  );
};

export default LightningInvoice;
