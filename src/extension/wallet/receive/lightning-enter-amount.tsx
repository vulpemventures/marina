import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router';
import { address, networks } from 'liquidjs-lib';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import Button from '../../components/button';
import LightningShowInvoice from './lightning-show-invoice';
import ModalUnlock from '../../components/modal-unlock';
import { SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { fromSatoshi, toSatoshi } from '../../utility';
import { broadcastTx } from '../../../../test/_regtest';
import { AccountFactory, MainAccount, MainAccountTest } from '../../../application/account';
import { useStorageContext } from '../../context/storage-context';
import {
  createReverseSubmarineSwap,
  DEFAULT_LIGHTNING_LIMITS,
  getInvoiceExpireDate,
} from '../../../application/boltz/utils';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { constructClaimTransaction } from '../../../application/boltz/claim';
import Boltz from '../../../application/boltz';

const LightningAmount: React.FC = () => {
  const history = useHistory();
  const { appRepository, cache, walletRepository } = useStorageContext();
  const [errors, setErrors] = useState({ amount: '', submit: '' });
  const [invoice, setInvoice] = useState('');
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limits, setLimits] = useState(DEFAULT_LIGHTNING_LIMITS);
  const [lookingForPayment, setIsLookingForPayment] = useState(false);
  const [touched, setTouched] = useState(false);

  const swapValue = useRef('');
  const network = cache?.network ?? 'liquid';
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

    if (!value) {
      setTouched(false);
      setErrors({ amount: '', submit: '' });
      swapValue.current = '';
      return;
    }

    if (Number.isNaN(value)) {
      setErrors({ amount: 'Not valid number', submit: '' });
      swapValue.current = '';
      return;
    }

    if (Number(value) <= 0) {
      setErrors({ amount: 'Number must be positive', submit: '' });
      swapValue.current = '';
      return;
    }

    if (Number(value) < limits.minimal) {
      setErrors({ amount: `Number must be higher then ${limits.minimal}`, submit: '' });
      swapValue.current = '';
      return;
    }

    if (Number(value) > limits.maximal) {
      setErrors({ amount: `Number must be lower then ${limits.maximal}`, submit: '' });
      swapValue.current = '';
      return;
    }

    setErrors({ amount: '', submit: '' });
    swapValue.current = value;
  };

  const handleUnlock = async (password: string) => {
    // disable Generate button
    setIsSubmitting(true);
    // close Modal
    showUnlockModal(false);

    try {
      // get account
      const accountFactory = await AccountFactory.create(walletRepository);
      const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
      const mainAccount = await accountFactory.make(network, accountName);

      // claim pub key
      const nextAddress = await mainAccount.getNextAddress(false);
      const accountDetails = Object.values(
        await walletRepository.getAccountDetails(accountName)
      )[0];
      const claimPublicKey = BIP32Factory(ecc)
        .fromBase58(accountDetails.masterXPub)
        .derivePath(nextAddress.derivationPath?.replace('m/', '') ?? '').publicKey;

      // create reverse submarine swap
      const { redeemScript, lockupAddress, invoice, preimage, blindingKey } =
        await createReverseSubmarineSwap(
          claimPublicKey,
          network,
          toSatoshi(Number(swapValue.current))
        );

      // all good, update states
      setInvoice(invoice);
      setIsLookingForPayment(true);

      // prepare timeout handler
      const invoiceExpireDate = Number(getInvoiceExpireDate(invoice));

      const invoiceExpirationTimeout = setTimeout(() => {
        setErrors({ submit: 'Invoice has expired', amount: '' });
        setIsSubmitting(false);
        setIsLookingForPayment(false);
        return;
      }, invoiceExpireDate - Date.now());

      walletRepository.onNewUtxo(network)(async (utxo) => {
        const witnessUtxo = await walletRepository.getWitnessUtxo(utxo.txid, utxo.vout);
        if (
          witnessUtxo?.script.toString('hex') ===
          address.toOutputScript(lockupAddress).toString('hex')
        ) {
          clearTimeout(invoiceExpirationTimeout);
          const claimTransaction = await constructClaimTransaction(
            [utxo],
            witnessUtxo,
            preimage,
            Buffer.from(redeemScript, 'hex'),
            address.toOutputScript(nextAddress.confidentialAddress),
            300,
            networks[network].assetHash,
            walletRepository,
            appRepository,
            password,
            true,
            Buffer.from(blindingKey, 'hex')
          );

          const txid = await broadcastTx(claimTransaction.toHex());

          history.push({
            pathname: SEND_PAYMENT_SUCCESS_ROUTE,
            state: { txid, text: 'Invoice paid !' },
          });
        }
      });
    } catch (err: any) {
      setErrors({ submit: err.message, amount: '' });
      setIsSubmitting(false);
      setIsLookingForPayment(false);
    }
  };

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  return (
    <ShellPopUp
      backBtnCb={isSubmitting || lookingForPayment ? handleBackBtn : undefined}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent bg-primary flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Receive⚡️"
    >
      {invoice ? (
        <LightningShowInvoice errors={errors} invoice={invoice} />
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
        handleUnlock={handleUnlock}
      />
    </ShellPopUp>
  );
};

export default LightningAmount;
