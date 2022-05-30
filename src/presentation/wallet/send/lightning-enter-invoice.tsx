import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import { NetworkString } from 'ldk';
import Button from '../../components/button';
import { fromSatoshi } from '../../utils/format';
import { selectMainAccount } from '../../../application/redux/selectors/wallet.selector';
import { useDispatch, useSelector } from 'react-redux';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import {
  incrementAddressIndex,
  incrementChangeAddressIndex,
} from '../../../application/redux/actions/wallet';
import { isSet } from '../../../application/utils/common';
import { DEFAULT_LIGHTNING_LIMITS, getInvoiceValue, isValidSubmarineSwap } from '../../utils/boltz';
import Boltz, { SubmarineSwapResponse } from '../../../application/utils/boltz';
import { createAddress } from '../../../domain/address';
import {
  setAddressesAndAmount,
  setPendingTxStep,
} from '../../../application/redux/actions/transaction';
import { SEND_CHOOSE_FEE_ROUTE } from '../../routes/constants';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { lbtcAssetByNetwork } from '../../../application/utils/network';

export interface LightningInvoiceProps {
  balances: BalancesByAsset;
  network: NetworkString;
}

const LightningInvoiceView: React.FC<LightningInvoiceProps> = ({ balances, network }) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const history = useHistory();
  const account = useSelector(selectMainAccount);

  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limits, setLimits] = useState(DEFAULT_LIGHTNING_LIMITS);
  const [touched, setTouched] = useState(false);
  const [value, setValue] = useState(0);

  const lbtcAssetHash = lbtcAssetByNetwork(network);
  const lbtcBalance = balances[lbtcAssetHash];

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

    if (!isSet(invoice)) {
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
    } catch (err: any) {
      setError('Invalid invoice');
    }
  };

  const handleProceed = async () => {
    setIsSubmitting(true);
    // get refund pub key and change address
    const identity = await account.getWatchIdentity(network);
    const refundAddress = await identity.getNextAddress();
    const refundPublicKey = refundAddress.publicKey!;
    const changeAddressGenerated = await identity.getNextChangeAddress();
    const changeAddress = createAddress(
      changeAddressGenerated.confidentialAddress,
      changeAddressGenerated.derivationPath
    );
    await dispatch(incrementAddressIndex(account.getAccountID(), network));
    await dispatch(incrementChangeAddressIndex(account.getAccountID(), network));

    try {
      // create submarine swap
      const { address, expectedAmount, redeemScript }: SubmarineSwapResponse =
        await boltz.createSubmarineSwap({ invoice, refundPublicKey });

      // validate submarine swap
      if (!isValidSubmarineSwap(redeemScript, refundPublicKey)) {
        setError('Invalid submarine swap, please try again');
        setIsSubmitting(false);
        return;
      }

      // push to store payment to be made
      await dispatch(setAddressesAndAmount(expectedAmount, [changeAddress], { value: address }));
      await dispatch(setPendingTxStep('address-amount'));

      // go to choose fee route
      history.push(SEND_CHOOSE_FEE_ROUTE);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err);
      return;
    }
  };

  const isButtonDisabled = () => !isSet(invoice) || isSet(error) || isSubmitting;

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
                      'border-red': isSet(error) && touched,
                      'border-grayLight': !isSet(error) || touched,
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
          {isSet(error) && touched && (
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

export default LightningInvoiceView;
