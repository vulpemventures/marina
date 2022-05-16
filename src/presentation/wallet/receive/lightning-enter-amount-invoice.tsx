import QRCode from 'qrcode.react';
import { randomBytes } from 'crypto';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { address, crypto, Transaction } from 'liquidjs-lib';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import { fetchTxHex, fetchUtxos, NetworkString, Outpoint } from 'ldk';
import Button from '../../components/button';
import Boltz, { ReverseSubmarineSwapResponse } from '../../../application/utils/boltz';
import { formatAddress, fromSatoshi, toSatoshi } from '../../utils/format';
import { selectMainAccount } from '../../../application/redux/selectors/wallet.selector';
import { useDispatch, useSelector } from 'react-redux';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { incrementAddressIndex } from '../../../application/redux/actions/wallet';
import { constructClaimTransaction, OutputType } from 'boltz-core-liquid';
import { broadcastTx, lbtcAssetByNetwork } from '../../../application/utils/network';
import { sleep } from '../../../application/utils/common';

export interface LightningAmountInvoiceProps {
  network: NetworkString;
  explorerURL: string;
}

const isSet = (value: string): boolean => value.length > 0;

const LightningAmountInvoiceView: React.FC<LightningAmountInvoiceProps> = ({
  explorerURL,
  network,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const history = useHistory();
  const account = useSelector(selectMainAccount);

  const [values, setValues] = useState({ amount: '' });
  const [errors, setErrors] = useState({ amount: '', submit: '' });
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookingForPayment, setIsLookingForPayment] = useState(false);

  const [invoice, setInvoice] = useState('');
  const [buttonText, setButtonText] = useState('Copy');
  const [isInvoiceExpanded, setisInvoiceExpanded] = useState(false);

  const [limits, setLimits] = useState({ maximal: 0.1, minimal: 0.0005 });

  const [txID, setTxID] = useState('');

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
  const handleExpand = () => setisInvoiceExpanded(true);
  const handleCopy = () => {
    navigator.clipboard.writeText(invoice).then(
      () => setButtonText('Copied'),
      (err) => console.error('Could not copy text: ', err)
    );
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    setTouched(true);

    const {
      target: { value },
    } = event;

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

    if (Number(value) <= limits.minimal) {
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // disable Generate button
    setIsSubmitting(true);
    try {
      // preimage
      const preimage = randomBytes(32);
      const preimageHash = crypto.sha256(preimage).toString('hex');

      // claim pub key
      const identity = await account.getWatchIdentity(network);
      const addr = await identity.getNextAddress();

      const pubKey = addr.publicKey!;
      await dispatch(incrementAddressIndex(account.getAccountID(), network)); // persist address

      const { redeemScript, lockupAddress, invoice }: ReverseSubmarineSwapResponse =
        await boltz.createReverseSubmarineSwap({
          invoiceAmount: toSatoshi(Number(values.amount)),
          preimageHash: preimageHash,
          claimPublicKey: pubKey,
        });

      setInvoice(invoice);
      setIsLookingForPayment(true);

      let utxos: Outpoint[] = [];
      while (utxos.length === 0) {
        await sleep(5000);
        utxos = await fetchUtxos(lockupAddress, explorerURL);
      }
      const [utxo] = utxos;
      const hex = await fetchTxHex(utxo.txid, explorerURL);
      const transaction = Transaction.fromHex(hex);
      const { script, value, asset, nonce } = transaction.outs[utxo.vout];

      // very unsafe, migrate to Psbt approach to claim the funds soon
      const keyPairUnsafe = account.getSigningKeyUnsafe('ciaociao', addr.derivationPath!, network);
      const claimTransaction = constructClaimTransaction(
        [
          {
            keys: keyPairUnsafe,
            redeemScript: Buffer.from(redeemScript, 'hex'),
            preimage,
            type: OutputType.Bech32,
            txHash: transaction.getHash(),
            vout: utxo.vout,
            script,
            value,
            asset,
            nonce,
          },
        ],
        address.toOutputScript(addr.confidentialAddress),
        1,
        true,
        lbtcAssetByNetwork(network)
      );

      const txid = await broadcastTx(explorerURL, claimTransaction.toHex());
      setTxID(txid);
      setIsLookingForPayment(false);
      setIsSubmitting(false);
    } catch (err: any) {
      setErrors({ submit: err.message, amount: '' });
      setIsSubmitting(false);
      setIsLookingForPayment(false);
    }
  };

  return (
    <ShellPopUp
      backBtnCb={isSubmitting || lookingForPayment || isSet(txID) ? handleBackBtn : undefined}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent bg-primary flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Receive⚡️"
    >
      {invoice && isSet(invoice) ? (
        <div className="w-80 h-96 rounded-4xl flex flex-col items-center justify-center p-10 mx-auto bg-white">
          <div className="flex flex-col items-center">
            <div className="mt-4">
              <QRCode size={176} value={invoice.toLowerCase()} />
            </div>
            {lookingForPayment && !isSet(txID) ? (
              <p className="mt-2.5 mb-2.5 text-xs font-medium">⏳ Waiting for payment...</p>
            ) : !lookingForPayment && isSet(txID) ? (
              <p className="mt-2.5 mb-2.5 text-xs font-medium">✅ Invoice paid!</p>
            ) : null}
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
          <p className="text-red h-10 mt-1 text-xs font-medium text-left">
            {isSet(errors.submit) ? errors.submit : ''}
          </p>
          <Button className="w-3/5 mt-4" onClick={handleCopy}>
            <span className="text-base antialiased font-bold">{buttonText}</span>
          </Button>
        </div>
      ) : (
        <div className="w-full h-screen p-10 bg-white">
          <form onSubmit={handleSubmit} className="mt-10">
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
                    value={values.amount}
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
                type="submit"
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

export default LightningAmountInvoiceView;
