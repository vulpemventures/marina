import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { networks } from 'liquidjs-lib';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import Button from '../../components/button';
import { LIGHTNING_SHOW_INVOICE_ROUTE } from '../../routes/constants';
import { fromSatoshi, toSatoshi } from '../../utility';
import { useStorageContext } from '../../context/storage-context';
import * as ecc from 'tiny-secp256k1';
import { randomBytes } from 'crypto';
import ECPairFactory from 'ecpair';
import { Boltz, boltzUrl } from '../../../pkg/boltz';
import zkp from '@vulpemventures/secp256k1-zkp';
import { Spinner } from '../../components/spinner';
import type { SwapData } from '../../../infrastructure/storage/receive-flow-repository';

const zkpLib = await zkp();

const LightningAmount: React.FC = () => {
  const history = useHistory();
  const { receiveFlowRepository, cache } = useStorageContext();
  const [errors, setErrors] = useState({ amount: '', submit: '' });
  const [invoice, setInvoice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limits, setLimits] = useState({ minimal: 0, maximal: 0 });
  const [lookingForPayment, setIsLookingForPayment] = useState(false);
  const [touched, setTouched] = useState(false);
  const [swapAmount, setSwapAmount] = useState(0);

  const network = cache?.network ?? 'liquid';
  const boltz = new Boltz(boltzUrl[network], networks[network].assetHash, zkpLib);

  useEffect(() => {
    // get maximal and minimal amount for pair
    const fetchData = async () => {
      const pair = await boltz.getBoltzPair('L-BTC/BTC');
      if (pair?.limits) {
        setLimits({
          maximal: fromSatoshi(pair.limits.maximal),
          minimal: fromSatoshi(pair.limits.minimal),
        });
      }
    };
    fetchData().catch(console.error);
  }, []);

  useEffect(() => {
    // get maximal and minimal amount for pair
    const fetchAmount = async () => {
      const amount = await receiveFlowRepository.getAmount();
      if (amount) {
        setSwapAmount(amount);
        setTouched(true);
      }
    };
    fetchAmount().catch(console.error);
  }, []);

  const makeSwap = async (): Promise<SwapData> => {
    // we will create an ephemeral key pair:
    // - it will generate a public key to be used with the Boltz swap
    // - later we will sign the claim transaction with the private key
    const claimPrivateKey = randomBytes(32);
    const claimKeyPair = ECPairFactory(ecc).fromPrivateKey(claimPrivateKey);
    const claimPublicKey = claimKeyPair.publicKey;

    // create reverse submarine swap
    const swapData = await boltz.createReverseSubmarineSwap(
      claimPublicKey,
      network,
      toSatoshi(swapAmount)
    );
    return { ...swapData, claimPrivateKey };
  };

  const handleBackBtn = () => history.goBack();

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    const value = event.target.value;
    setSwapAmount(Number(value));
    await receiveFlowRepository.setAmount(Number(value));

    if (!limits.minimal) return;

    setTouched(true);

    if (!value) {
      setTouched(false);
      setErrors({ amount: '', submit: '' });
      return;
    }

    if (Number.isNaN(value)) {
      setErrors({ amount: 'Not valid number', submit: '' });
      return;
    }

    if (Number(value) <= 0) {
      setErrors({ amount: 'Number must be positive', submit: '' });
      return;
    }

    if (Number(value) < limits.minimal) {
      setErrors({ amount: `Number must be equal or higher then ${limits.minimal}`, submit: '' });
      return;
    }

    if (Number(value) > limits.maximal) {
      setErrors({ amount: `Number must be equal or lower then ${limits.maximal}`, submit: '' });
      return;
    }

    setErrors({ amount: '', submit: '' });
  };

  const handleGenerate = async () => {
    // disable Generate button
    setIsSubmitting(true);

    try {
      const swapData = await makeSwap();

      // all good, update states
      setInvoice(invoice);
      setIsLookingForPayment(true);

      // save swap data to storage
      await receiveFlowRepository.setSwapData(swapData);

      // shows invoice and waits for claim tx
      history.push({
        pathname: LIGHTNING_SHOW_INVOICE_ROUTE,
      });
    } catch (err: any) {
      setErrors({ submit: err.message, amount: '' });
      setIsSubmitting(false);
      setIsLookingForPayment(false);
    }
  };

  return (
    <ShellPopUp
      backBtnCb={isSubmitting || lookingForPayment ? handleBackBtn : undefined}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent bg-primary flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Receive⚡️"
    >
      {!limits.minimal ? (
        <Spinner color="#fefefe" />
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
                        'border-red': errors.amount && touched,
                        'border-grayLight': !errors.amount || touched,
                      }
                    )}
                    id="amount"
                    name="amount"
                    onChange={handleChange}
                    placeholder="0"
                    type="number"
                    lang="en"
                    value={swapAmount}
                  />
                </div>
              </label>
            </div>
            <p className="text-red h-10 mt-1 text-xs font-medium text-left">
              {errors.submit && errors.submit}
              {errors.amount && touched && errors.amount}
            </p>
            <div className="text-right">
              <Button
                className="w-3/5 mt-2 text-base"
                disabled={isSubmitting || (errors.amount && touched) || !touched}
                onClick={handleGenerate}
              >
                Generate
              </Button>
            </div>
          </form>
        </div>
      )}
    </ShellPopUp>
  );
};

export default LightningAmount;
