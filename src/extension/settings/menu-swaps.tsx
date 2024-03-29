import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import ShellPopUp from '../components/shell-popup';
import Button from '../components/button';
import cx from 'classnames';
import * as ecc from 'tiny-secp256k1';
import { extractErrorMessage } from '../utility/error';
import zkp from '@vulpemventures/secp256k1-zkp';
import { Boltz, boltzUrl } from '../../pkg/boltz';
import { address, networks } from 'liquidjs-lib';
import { useStorageContext } from '../context/storage-context';
import { SEND_PAYMENT_SUCCESS_ROUTE } from '../routes/constants';
import type { ECPairInterface } from 'ecpair';
import ECPairFactory from 'ecpair';
import type { RefundableSwapParams } from '../../domain/repository';
import { AccountFactory, MainAccount, MainAccountTest } from '../../application/account';
import BIP32Factory from 'bip32';
import { toBlindingData } from 'liquidjs-lib/src/psbt';
import { decrypt } from '../../domain/encryption';
import { mnemonicToSeed } from 'bip39';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import { toOutputScript } from 'liquidjs-lib/src/address';
import axios from 'axios';

const zkpLib = await zkp();
const bip32 = BIP32Factory(ecc);

const SettingsMenuSwaps: React.FC = () => {
  const history = useHistory();
  const {
    cache,
    appRepository,
    walletRepository,
    refundableSwapsRepository,
    refundSwapFlowRepository,
  } = useStorageContext();

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundableSwapParams, setRefundableSwapParams] = useState<RefundableSwapParams>();
  const [touched, setTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const network = cache?.network ?? 'liquid';
  const boltz = new Boltz(boltzUrl[network], networks[network].assetHash, zkpLib);

  useEffect(() => {
    (async () => {
      const params = await refundSwapFlowRepository.getParams();
      if (params) {
        setTouched(true);
        setRefundableSwapParams(params);
        await refundSwapFlowRepository.reset();
        document.getElementById('json')!.innerText = JSON.stringify(params);
        void validateParams(JSON.stringify(params));
      }
    })().catch(console.error);
  }, []);

  const findDerivationPath = async (refundPublicKey: string): Promise<string> => {
    // get account
    const accountFactory = await AccountFactory.create(walletRepository);
    const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
    const mainAccount = await accountFactory.make(network, accountName);
    const addresses = await mainAccount.getAllAddresses();
    // find address
    const [usedAddress] = addresses.filter((a) => a.publicKey === refundPublicKey);
    if (usedAddress?.derivationPath) return usedAddress.derivationPath;
    // check if by any chance the address used is missing on marina cache
    // by iterating through the next 20 addresses
    for (let i = 0; i < 20; i++) {
      const nextAddress = await mainAccount.getNextAddress(false);
      if (nextAddress.publicKey === refundPublicKey && nextAddress.derivationPath)
        return nextAddress.derivationPath;
    }
    throw new Error('derivation path not found');
  };

  const getKeyPairFromDerivationPath = async (
    derivationPath: string,
    baseDerivationPath: string,
    password: string
  ): Promise<ECPairInterface> => {
    const encrypted = await walletRepository.getEncryptedMnemonic();
    if (!encrypted) throw new Error('No mnemonic found in wallet');
    const decryptedMnemonic = await decrypt(encrypted, password);
    const masterNode = bip32.fromSeed(await mnemonicToSeed(decryptedMnemonic));
    const key = masterNode
      .derivePath(baseDerivationPath)
      .derivePath(derivationPath.replace('m/', ''));
    return ECPairFactory(ecc).fromPrivateKey(key.privateKey!);
  };

  const getBlockTip = async (): Promise<number> => {
    const webExplorerURL = await appRepository.getWebExplorerURL();
    const url = `${webExplorerURL?.replace(
      // stupid bug from mempool
      'liquid.network/testnet',
      'liquid.network/liquidtestnet'
    )}/api/blocks/tip/height`;
    const { data } = await axios.get(url);
    return Number(data);
  };

  const validateParams = async (params: string) => {
    try {
      const json = JSON.parse(params);
      if (!json.blindingKey) throw new Error('Invalid JSON: missing blindingKey');
      if (!json.redeemScript) throw new Error('Invalid JSON: missing redeemScript');
      if (!json.network) json.network = network;

      const { blindingKey, fundingAddress, redeemScript, refundPublicKey, timeoutBlockHeight } =
        boltz.extractInfoFromRefundableSwapParams(json);

      const derivationPath = await findDerivationPath(refundPublicKey);

      const blockTip = await getBlockTip();
      if (blockTip && blockTip < timeoutBlockHeight)
        throw new Error(`Still locked, unlocks in ${timeoutBlockHeight - blockTip} blocks`);

      setRefundableSwapParams({
        blindingKey,
        derivationPath,
        fundingAddress,
        network: json.network,
        redeemScript,
        refundPublicKey,
        timeoutBlockHeight,
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleJsonChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setError('');
    setTouched(true);
    await validateParams(event.target.value);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsSubmitting(false);
    setPasswordError('');
    setPassword(event.target.value);
  };

  const handleProceed = async () => {
    setIsSubmitting(true);
    try {
      if (!refundableSwapParams) throw new Error('No refundableSwapParams');

      const chainSource = await appRepository.getChainSource(network);
      if (!chainSource) throw new Error('Chain source not found for network ' + network);

      const {
        blindingKey,
        derivationPath,
        fundingAddress,
        redeemScript,
        refundPublicKey,
        timeoutBlockHeight,
      } = refundableSwapParams;

      if (!derivationPath) return setError('Unable to find derivation path');
      if (!fundingAddress) return setError('Unable to find funding address');
      if (!refundPublicKey) return setError('Unable to find refund public key');

      // generate blindingPublicKey and destinationScript
      const accountFactory = await AccountFactory.create(walletRepository);
      const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
      const mainAccount = await accountFactory.make(network, accountName);
      const addr = await mainAccount.getNextAddress(false);
      const blindingPublicKey = address.fromConfidential(addr.confidentialAddress).blindingKey;
      const destinationScript = toOutputScript(addr.confidentialAddress).toString('hex');

      const accountDetails = await walletRepository.getAccountDetails(accountName);
      const baseDerivationPath = accountDetails[accountName].baseDerivationPath;

      // get key pair
      const refundKeyPair = await getKeyPairFromDerivationPath(
        derivationPath,
        baseDerivationPath,
        password
      );
      if (!refundKeyPair) return setError('Unable to get key pair');

      // fetch utxos for funding address
      const [utxo] = await chainSource.listUnspents(fundingAddress);
      if (!utxo) return setError('Unable to find UTXO');

      // unblind utxo if not unblinded
      if (!utxo.blindingData) {
        const { asset, assetBlindingFactor, value, valueBlindingFactor } = await toBlindingData(
          Buffer.from(blindingKey, 'hex'),
          utxo.witnessUtxo
        );
        utxo['blindingData'] = {
          asset: asset.reverse().toString('hex'),
          assetBlindingFactor: assetBlindingFactor.toString('hex'),
          value: parseInt(value, 10),
          valueBlindingFactor: valueBlindingFactor.toString('hex'),
        };
      }

      // make refund transaction
      const refundTransaction = boltz.makeRefundTransaction({
        utxo,
        refundKeyPair,
        redeemScript: Buffer.from(redeemScript, 'hex'),
        timeoutBlockHeight,
        destinationScript: Buffer.from(destinationScript, 'hex'),
        blindingPublicKey,
      });

      // broadcast refund transaction
      console.log('refund tx hex', refundTransaction.toHex());
      const txid = await chainSource.broadcastTransaction(refundTransaction.toHex());
      if (!txid) return setError('Error broadcasting refund transaction');

      // remove swap from refundable swaps repository
      await refundableSwapsRepository.removeSwap(refundableSwapParams);

      // jump to success page
      history.push({
        pathname: SEND_PAYMENT_SUCCESS_ROUTE,
        state: { txhex: refundTransaction.toHex(), text: 'Payment received!' },
      });
    } catch (err) {
      setPasswordError(extractErrorMessage(err));
    }
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
                onChange={handleJsonChange}
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
          {touched && !error && (
            <>
              <p className="mt-10 mb-2 font-medium text-left">Password</p>
              <input
                name="password"
                placeholder="Password"
                type="password"
                onChange={handlePasswordChange}
              />
            </>
          )}
          {passwordError && (
            <p className="text-red mt-1 text-xs font-medium text-left">{passwordError}</p>
          )}
          <ButtonsAtBottom>
            <Button
              className="w-3/5 mt-6 text-base"
              disabled={Boolean(!touched || error || isSubmitting)}
              onClick={handleProceed}
            >
              Proceed
            </Button>
          </ButtonsAtBottom>
        </form>
      </div>
    </ShellPopUp>
  );
};

export default SettingsMenuSwaps;
