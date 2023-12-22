import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { address, networks } from 'liquidjs-lib';
import ShellPopUp from '../../components/shell-popup';
import Button from '../../components/button';
import { SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { formatAddress } from '../../utility';
import { useStorageContext } from '../../context/storage-context';
import { toBlindingData } from 'liquidjs-lib/src/psbt';
import { Boltz, boltzUrl } from '../../../pkg/boltz';
import zkp from '@vulpemventures/secp256k1-zkp';
import { AccountFactory, MainAccount, MainAccountTest } from '../../../application/account';
import { toOutputScript } from 'liquidjs-lib/src/address';
import QRCode from 'qrcode.react';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import LightningError from './lightning-error';

const zkpLib = await zkp();

const LightningShowInvoice: React.FC = () => {
  const history = useHistory();
  const { appRepository, receiveFlowRepository, walletRepository, cache } = useStorageContext();
  const [errors, setErrors] = useState({ amount: '', submit: '' });
  const [invoice, setInvoice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookingForPayment, setIsLookingForPayment] = useState(false);
  const [buttonText, setButtonText] = useState('Copy');
  const [isInvoiceExpanded, setisInvoiceExpanded] = useState(false);

  const network = cache?.network ?? 'liquid';
  const boltz = new Boltz(boltzUrl[network], networks[network].assetHash, zkpLib);

  const invoiceHasExpired = async () => {
    setErrors({ submit: 'Invoice has expired', amount: '' });
    setIsSubmitting(false);
    setIsLookingForPayment(false);
    await receiveFlowRepository.reset();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(invoice).then(
      () => setButtonText('Copied'),
      (err) => console.error('Could not copy text: ', err)
    );
  };

  const handleBackBtn = () => history.goBack();

  useEffect(() => {
    const claim = async () => {
      try {
        const swapData = await receiveFlowRepository.getSwapData();
        if (!swapData) return <LightningError />;

        const {
          redeemScript,
          lockupAddress,
          invoice,
          preimage,
          blindingPrivateKey,
          claimPrivateKey,
        } = swapData;

        const claimKeyPair = ECPairFactory(ecc).fromPrivateKey(claimPrivateKey);

        // all good, update states
        setInvoice(invoice);
        setIsLookingForPayment(true);

        // prepare timeout handler
        const invoiceExpireDate = Number(boltz.getInvoiceExpireDate(invoice));

        if (invoiceExpireDate < Date.now()) return invoiceHasExpired();

        const invoiceExpirationTimeout = setTimeout(
          invoiceHasExpired,
          invoiceExpireDate - Date.now()
        );

        // wait for tx to be available (mempool or confirmed)
        const chainSource = await appRepository.getChainSource(network);
        if (!chainSource) throw new Error('chain source is not set up, cannot broadcast');
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

          await receiveFlowRepository.reset();

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
    claim().catch(console.error);
  }, []);

  const AuxiliarButton = ({ children }: { children: React.ReactNode }) => (
    <button
      className="text-primary focus:outline-none text-xs font-medium"
      onClick={() => setisInvoiceExpanded(!isInvoiceExpanded)}
    >
      {children}
    </button>
  );

  return (
    <ShellPopUp
      backBtnCb={isSubmitting || lookingForPayment ? handleBackBtn : undefined}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent bg-primary flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Receive⚡️"
    >
      <div className="w-80 h-96 rounded-4xl flex flex-col items-center justify-between px-10 py-4 mx-auto bg-white">
        <p className="mb-4 text-xs font-medium whitespace-pre">⏳ Waiting for payment...</p>
        {isInvoiceExpanded ? (
          <>
            <p className="text-xs font-medium break-all">{invoice}</p>
            <AuxiliarButton>Show QR Code</AuxiliarButton>
          </>
        ) : (
          <>
            <QRCode size={176} value={invoice.toLowerCase()} />
            <p className="font-regular mt-4 text-lg">{formatAddress(invoice)}</p>
            <AuxiliarButton>Expand</AuxiliarButton>
          </>
        )}
        {errors.submit && (
          <p className="text-red mt-1 text-xs font-medium text-left">{errors.submit}</p>
        )}
        <Button className="w-3/5 mt-4" onClick={handleCopy}>
          <span className="text-base antialiased font-bold">{buttonText}</span>
        </Button>
      </div>
    </ShellPopUp>
  );
};

export default LightningShowInvoice;
