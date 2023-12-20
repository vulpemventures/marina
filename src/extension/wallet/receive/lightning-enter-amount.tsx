import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router';
import { address, networks } from 'liquidjs-lib';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import Button from '../../components/button';
import LightningShowInvoice from './lightning-show-invoice';
import { SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { fromSatoshi, toSatoshi } from '../../utility';
import { useStorageContext } from '../../context/storage-context';
import * as ecc from 'tiny-secp256k1';
import { toBlindingData } from 'liquidjs-lib/src/psbt';
import { randomBytes } from 'crypto';
import ECPairFactory from 'ecpair';
import { Boltz, boltzUrl } from '../../../pkg/boltz';
import zkp from '@vulpemventures/secp256k1-zkp';
import { AccountFactory, MainAccount, MainAccountTest } from '../../../application/account';
import { toOutputScript } from 'liquidjs-lib/src/address';
import { Spinner } from '../../components/spinner';

const zkpLib = await zkp();

const LightningAmount: React.FC = () => {
  const history = useHistory();
  const { appRepository, walletRepository, cache } = useStorageContext();
  const [errors, setErrors] = useState({ amount: '', submit: '' });
  const [invoice, setInvoice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limits, setLimits] = useState({ minimal: 0, maximal: 0 });
  const [lookingForPayment, setIsLookingForPayment] = useState(false);
  const [touched, setTouched] = useState(false);

  const swapValue = useRef('');
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

  const handleBackBtn = () => history.goBack();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (!limits.minimal) return;

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
      setErrors({ amount: `Number must be equal or higher then ${limits.minimal}`, submit: '' });
      swapValue.current = '';
      return;
    }

    if (Number(value) > limits.maximal) {
      setErrors({ amount: `Number must be equal or lower then ${limits.maximal}`, submit: '' });
      swapValue.current = '';
      return;
    }

    setErrors({ amount: '', submit: '' });
    swapValue.current = value;
  };

  const handleUnlock = async () => {
    // disable Generate button
    setIsSubmitting(true);

    try {
      // we will create an ephemeral key pair:
      // - it will generate a public key to be used with the Boltz swap
      // - later we will sign the claim transaction with the private key
      const claimPrivateKey = randomBytes(32);
      const claimKeyPair = ECPairFactory(ecc).fromPrivateKey(claimPrivateKey);
      const claimPublicKey = claimKeyPair.publicKey;

      // create reverse submarine swap
      const { redeemScript, lockupAddress, invoice, preimage, blindingPrivateKey } =
        await boltz.createReverseSubmarineSwap(
          claimPublicKey,
          network,
          toSatoshi(Number(swapValue.current))
        );

      // all good, update states
      setInvoice(invoice);
      setIsLookingForPayment(true);

      // prepare timeout handler
      const invoiceExpireDate = Number(boltz.getInvoiceExpireDate(invoice));

      const invoiceExpirationTimeout = setTimeout(() => {
        setErrors({ submit: 'Invoice has expired', amount: '' });
        setIsSubmitting(false);
        setIsLookingForPayment(false);
        return;
      }, invoiceExpireDate - Date.now());

      const chainSource = await appRepository.getChainSource(network);
      if (!chainSource) throw new Error('chain source is not set up, cannot broadcast');
      // wait for tx to be available (mempool or confirmed)
      await chainSource.waitForAddressReceivesTx(lockupAddress);

      // fetch utxos for address
      const [utxo] = await chainSource.listUnspents(lockupAddress);
      const { asset, assetBlindingFactor, value, valueBlindingFactor } = await toBlindingData(
        Buffer.from(blindingPrivateKey, 'hex'),
        utxo.witnessUtxo
      );
      utxo['blindingData'] = {
        asset: asset.reverse().toString('hex'),
        assetBlindingFactor: assetBlindingFactor.toString('hex'),
        value: parseInt(value, 10),
        valueBlindingFactor: valueBlindingFactor.toString('hex'),
      };

      // Claim transaction
      if (
        utxo.witnessUtxo?.script.toString('hex') ===
        address.toOutputScript(lockupAddress).toString('hex')
      ) {
        clearTimeout(invoiceExpirationTimeout);

        // Receiving address
        const accountFactory = await AccountFactory.create(walletRepository);
        const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
        const mainAccount = await accountFactory.make(network, accountName);
        const addr = await mainAccount.getNextAddress(false);
        const blindingPublicKey = address.fromConfidential(addr.confidentialAddress).blindingKey;
        const destinationScript = toOutputScript(addr.confidentialAddress).toString('hex');

        const claimTransaction = boltz.makeClaimTransaction({
          utxo,
          claimKeyPair,
          preimage,
          redeemScript: Buffer.from(redeemScript, 'hex'),
          destinationScript: Buffer.from(destinationScript, 'hex'),
          blindingPublicKey,
        });

        await chainSource.broadcastTransaction(claimTransaction.toHex());

        history.push({
          pathname: SEND_PAYMENT_SUCCESS_ROUTE,
          state: { txhex: claimTransaction.toHex(), text: 'Payment received!' },
        });
      }
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
      ) : invoice ? (
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
                onClick={handleUnlock}
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
