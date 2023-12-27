import React, { useState } from 'react';
import { useHistory } from 'react-router';
import ShellPopUp from '../components/shell-popup';
import Button from '../components/button';
import cx from 'classnames';
import * as ecc from 'tiny-secp256k1';
import { extractErrorMessage } from '../utility/error';
import zkp from '@vulpemventures/secp256k1-zkp';
import { Boltz, boltzUrl } from '../../pkg/boltz';
import { networks } from 'liquidjs-lib';
import { useStorageContext } from '../context/storage-context';
import { SEND_PAYMENT_SUCCESS_ROUTE } from '../routes/constants';
import ECPairFactory from 'ecpair';
import type { SwapParams } from '../../domain/repository';
import { AccountFactory, MainAccount, MainAccountTest } from '../../application/account';
import BIP32Factory from 'bip32';

const zkpLib = await zkp();

// TODO

const SettingsMenuSwaps: React.FC = () => {
  const history = useHistory();
  const { cache, appRepository, walletRepository } = useStorageContext();

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [json, setJson] = useState<SwapParams>();
  const [touched, setTouched] = useState(false);

  const network = cache?.network ?? 'liquid';
  const boltz = new Boltz(boltzUrl[network], networks[network].assetHash, zkpLib);

  const findKeyPairFromPublicKey = async (publicKey: string) => {
    // get account
    const accountFactory = await AccountFactory.create(walletRepository);
    const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
    const mainAccount = await accountFactory.make(network, accountName);
    const accountDetails = Object.values(await walletRepository.getAccountDetails(accountName))[0];

    const [usedAddress] = (await mainAccount.getAllAddresses()).filter((a) => {
      const possiblePublicKey = BIP32Factory(ecc)
        .fromBase58(accountDetails.masterXPub)
        .derivePath(a.derivationPath?.replace('m/', '') ?? '')
        .publicKey.toString('hex');
      return possiblePublicKey === publicKey;
    });
    console.log('usedAddress', usedAddress);

    // get refund pub key and change address
    // const refundAddress = await mainAccount.getNextAddress(false);
    // const accountDetails = Object.values(await walletRepository.getAccountDetails(accountName))[0];
    // const refundPublicKey = BIP32Factory(ecc)
    //   .fromBase58(accountDetails.masterXPub)
    //   .derivePath(refundAddress.derivationPath?.replace('m/', '') ?? '')
    //   .publicKey.toString('hex');

    const refundPrivateKey = Buffer.from(
      '8acb390265b2edd2f87ce295e957d4ea8c13089a9aced0890351d03cffb7d272',
      'hex'
    );
    return ECPairFactory(ecc).fromPrivateKey(refundPrivateKey);
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setError('');
    setTouched(true);
    try {
      const { blindingKey, redeemScript } = JSON.parse(event.target.value);
      if (!blindingKey) throw new Error('Invalid JSON: missing blindingKey');
      if (!redeemScript) throw new Error('Invalid JSON: missing redeemScript');
      const purged = { blindingKey, network, redeemScript };
      setJson(purged);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleProceed = async () => {
    if (!json) return;
    setIsSubmitting(true);

    const chainSource = await appRepository.getChainSource(network);
    if (!chainSource) throw new Error('Chain source not found for network ' + network);

    const { fundingAddress, redeemScript, refundPublicKey, timeoutBlockHeight } =
      boltz.extractInfoFromSwapParams(json);

    if (!fundingAddress) return setError('Unable to find funding address');
    if (!refundPublicKey) return setError('Unable to find refund public key');

    const refundKeyPair = await findKeyPairFromPublicKey(refundPublicKey);

    // fetch utxos for address
    console.log('fundingAddress', fundingAddress);
    const [utxo] = await chainSource.listUnspents(fundingAddress);
    if (!utxo) return setError('Unable to find UTXO');

    const refundTransaction = boltz.makeRefundTransaction({
      utxo,
      refundKeyPair,
      redeemScript: Buffer.from(redeemScript, 'hex'),
      timeoutBlockHeight,
      destinationScript: Buffer.from('0'),
      blindingPublicKey: Buffer.from('0'),
    });

    await chainSource.broadcastTransaction(refundTransaction.toHex());

    history.push({
      pathname: SEND_PAYMENT_SUCCESS_ROUTE,
      state: { txhex: refundTransaction.toHex(), text: 'Payment received!' },
    });
  };

  return (
    <ShellPopUp className="h-popupContent" currentPage="Refund swap">
      <div className="w-full h-full p-10 bg-white">
        <form className="mt-2">
          <div>
            <label className="block">
              <p className="mb-2 text-base font-medium text-left">JSON</p>
              <textarea
                rows={4}
                id="json"
                name="json"
                onChange={handleChange}
                className={cx('border-2 focus:border-primary block w-full rounded-md', {
                  'border-red': error && touched,
                  'border-grayLight': !error || touched,
                })}
              />
            </label>
          </div>
          {error && touched && (
            <p className="text-red mt-1 text-xs font-medium text-left">{error}</p>
          )}
          <div className="text-right">
            <Button
              className="w-3/5 mt-6 text-base"
              disabled={Boolean(!touched || error || isSubmitting)}
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

export default SettingsMenuSwaps;
