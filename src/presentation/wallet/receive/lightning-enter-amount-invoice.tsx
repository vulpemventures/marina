import QRCode from 'qrcode.react';
import { debounce } from 'lodash';
import { randomBytes } from 'crypto';
import React, { useRef, useState } from 'react';
import { useHistory } from 'react-router';
import { address, crypto, networks, Transaction } from 'liquidjs-lib';
import ShellPopUp from '../../components/shell-popup';
import cx from 'classnames';
import { fetchTxHex, fetchUtxos, NetworkString, Outpoint, UnblindedOutput } from 'ldk';
import Button from '../../components/button';
import Boltz, { ReverseSubmarineSwapResponse } from '../../../application/utils/boltz';
import { DEFAULT_ROUTE } from '../../routes/constants';
import { formatAddress, toSatoshi } from '../../utils/format';
import { Account } from '../../../domain/account';
import { selectMainAccount } from '../../../application/redux/selectors/wallet.selector';
import { useDispatch, useSelector } from 'react-redux';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { incrementAddressIndex } from '../../../application/redux/actions/wallet';
import { constructClaimTransaction, OutputType } from 'boltz-core-liquid';
import { broadcastTx } from '../../../application/utils/network';
import { sleep } from '../../../application/utils/common';


export interface LightningAmountInvoiceProps {
  network: NetworkString;
  account: Account;
  utxos: UnblindedOutput[];
}

const isSet = (value: string): boolean => value.length > 0;

const LightningAmountInvoiceView: React.FC<LightningAmountInvoiceProps> = ({ network }) => {
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

  const [txID, setTxID] = useState('');

  const handleBackBtn = () => history.goBack();
  const handleBackToHome = () => history.push(DEFAULT_ROUTE);
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
      const boltz = new Boltz(network);

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

      const explorerUrl = 'https://liquid.network/liquidtestnet/api';

      let utxos: Outpoint[] = [];
      while (utxos.length === 0) {
        await sleep(5000);
        utxos = await fetchUtxos(lockupAddress, explorerUrl);
      }
      const [utxo] = utxos;
      const hex = await fetchTxHex(utxo.txid, explorerUrl);
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
        networks.testnet.assetHash
      );

      const txid = await broadcastTx(explorerUrl, claimTransaction.toHex());
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
      className="h-popupContent container mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Receive⚡️"
    >
      {invoice && isSet(invoice) ? (
        <div className="flex flex-col items-center justify-between">
          <div className="flex flex-col items-center">
            <div className="mt-4">
              <QRCode size={176} value={invoice.toLowerCase()} />
            </div>
            {lookingForPayment && !isSet(txID) ? (
              <p className="mt-2.5 mb-2.5 text-xs font-medium">⏳ Waiting for payment...</p>
            ): !lookingForPayment && isSet(txID) ? (
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
          {isSet(errors.submit) && (
            <p className="text-red h-10 mt-1 text-xs font-medium text-left">{errors.submit}</p>
          )}
          <Button className="w-3/5" onClick={handleCopy}>
            <span className="text-base antialiased font-bold">{buttonText}</span>
          </Button>
        </div>
      ) : (
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
            {isSet(errors.amount) && touched && (
              <p className="text-red h-10 mt-1 text-xs font-medium text-left">{errors.amount}</p>
            )}
          </div>

          {isSet(errors.submit) && (
              <p className="text-red h-10 mt-1 text-xs font-medium text-left">{errors.submit}</p>
          )}
          <div className="text-right mt-12">
            <Button
              className="w-2/5 -mt-2 text-base"
              disabled={isSubmitting || (isSet(errors.amount) && touched) || !touched}
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
