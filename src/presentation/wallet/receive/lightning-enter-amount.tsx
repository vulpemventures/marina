import { randomBytes } from 'crypto';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { crypto } from 'liquidjs-lib';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import type { NetworkString, Outpoint } from 'ldk';
import { fetchUtxos } from 'ldk';
import Button from '../../components/button';
import type { ReverseSubmarineSwapResponse } from '../../../application/utils/boltz';
import Boltz from '../../../application/utils/boltz';
import { fromSatoshi, toSatoshi } from '../../utils/format';
import { selectMainAccount } from '../../../application/redux/selectors/wallet.selector';
import { useDispatch, useSelector } from 'react-redux';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { incrementAddressIndex } from '../../../application/redux/actions/wallet';
import { broadcastTx } from '../../../application/utils/network';
import { isSet, sleep } from '../../../application/utils/common';
import LightningShowInvoiceView from './lightning-show-invoice';
import ModalUnlock from '../../components/modal-unlock';
import { debounce } from 'lodash';
import {
  DEFAULT_LIGHTNING_LIMITS,
  getClaimTransaction,
  getInvoiceExpireDate,
  isValidReverseSubmarineSwap,
} from '../../utils/boltz';
import { SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
export interface LightningAmountProps {
  network: NetworkString;
  explorerURL: string;
}

const LightningAmountView: React.FC<LightningAmountProps> = ({ explorerURL, network }) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const history = useHistory();
  const account = useSelector(selectMainAccount);

  const [errors, setErrors] = useState({ amount: '', submit: '' });
  const [invoice, setInvoice] = useState('');
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limits, setLimits] = useState(DEFAULT_LIGHTNING_LIMITS);
  const [lookingForPayment, setIsLookingForPayment] = useState(false);
  const [touched, setTouched] = useState(false);
  const [values, setValues] = useState({ amount: '' });

  const boltz = new Boltz(network);

  useEffect(() => {
    // get maximal and minimal amount for pair
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

    setTouched(true);

    const value = event.target.value;

    if (!isSet(value)) {
      setTouched(false);
      setErrors({ amount: '', submit: '' });
      setValues({ amount: value });
      return;
    }

    if (Number.isNaN(value)) {
      setErrors({ amount: 'Not valid number', submit: '' });
      setValues({ amount: value });
      return;
    }

    if (Number(value) <= 0) {
      setErrors({ amount: 'Number must be positive', submit: '' });
      setValues({ amount: value });
      return;
    }

    if (Number(value) < limits.minimal) {
      setErrors({ amount: `Number must be higher then ${limits.minimal}`, submit: '' });
      setValues({ amount: value });
      return;
    }

    if (Number(value) > limits.maximal) {
      setErrors({ amount: `Number must be lower then ${limits.maximal}`, submit: '' });
      setValues({ amount: value });
      return;
    }

    setErrors({ amount: '', submit: '' });
    setValues({ amount: value });
  };

  const handleUnlock = async (password: string) => {
    // disable Generate button
    setIsSubmitting(true);
    // close Modal
    showUnlockModal(false);

    try {
      // preimage
      const preimage = randomBytes(32);
      const preimageHash = crypto.sha256(preimage).toString('hex');

      // claim pub key
      const identity = await account.getWatchIdentity(network);
      const nextAddress = await identity.getNextAddress();
      const pubKey = nextAddress.publicKey!;
      await dispatch(incrementAddressIndex(account.getAccountID(), network));

      // create reverse submarine swap
      const { redeemScript, lockupAddress, invoice }: ReverseSubmarineSwapResponse =
        await boltz.createReverseSubmarineSwap({
          invoiceAmount: toSatoshi(Number(values.amount)),
          preimageHash: preimageHash,
          claimPublicKey: pubKey,
        });

      // check if invoice is valid
      if (!isValidReverseSubmarineSwap(invoice, lockupAddress, preimage, pubKey, redeemScript)) {
        setErrors({ submit: 'Invalid invoice received, please try again', amount: '' });
        setIsSubmitting(false);
        setIsLookingForPayment(false);
        return;
      }

      // all good, update states
      setInvoice(invoice);
      setIsLookingForPayment(true);

      // check invoice expiration
      const invoiceExpireDate = Number(getInvoiceExpireDate(invoice));

      // wait for utxo to arrive
      // we assume the utxo is unconfidential
      let utxos: Outpoint[] = [];
      while (utxos.length === 0 && Date.now() <= invoiceExpireDate) {
        utxos = await fetchUtxos(lockupAddress, explorerURL);
        await sleep(5000);
      }

      // payment was never made, and the invoice expired
      if (utxos.length === 0) {
        setErrors({ submit: 'Invoice has expired', amount: '' });
        setIsSubmitting(false);
        setIsLookingForPayment(false);
        return;
      }

      // get claim transaction
      const claimTransaction = await getClaimTransaction(
        account,
        nextAddress,
        explorerURL,
        network,
        password,
        preimage,
        redeemScript,
        utxos
      );

      // broadcast claim transaction
      const txid = await broadcastTx(explorerURL, claimTransaction.toHex());

      // push to success page
      history.push({
        pathname: SEND_PAYMENT_SUCCESS_ROUTE,
        state: { txid },
      });
    } catch (err: any) {
      setErrors({ submit: err.message, amount: '' });
      setIsSubmitting(false);
      setIsLookingForPayment(false);
    }
  };

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);
  const debouncedHandleUnlock = debounce(handleUnlock, 2000, { leading: true, trailing: false });

  return (
    <ShellPopUp
      backBtnCb={isSubmitting || lookingForPayment ? handleBackBtn : undefined}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent bg-primary flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Receive⚡️"
    >
      {invoice && isSet(invoice) ? (
        <LightningShowInvoiceView errors={errors} invoice={invoice} />
      ) : (
        <div className="w-full h-full p-10 bg-white">
          <form className="mt-10">
            <div>
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
                  />
                </div>
              </label>
            </div>
            <p className="text-red h-10 mt-1 text-xs font-medium text-left">
              {isSet(errors.submit) && errors.submit}
              {isSet(errors.amount) && touched && errors.amount}
            </p>
            <div className="text-right">
              <Button
                className="w-3/5 mt-2 text-base"
                disabled={isSubmitting || (isSet(errors.amount) && touched) || !touched}
                onClick={handleUnlockModalOpen}
              >
                Generate
              </Button>
            </div>
          </form>
        </div>
      )}
      <ModalUnlock
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={debouncedHandleUnlock}
      />
    </ShellPopUp>
  );
};

export default LightningAmountView;
