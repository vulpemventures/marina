import { transactionInitState } from '../../src/application/redux/reducers/transaction-reducer';
import assets from './assets.json';
import { confidentialAddresses } from './wallet.json';
import { Address } from '../../src/domain/wallet/value-objects';

export const transactionStateWithAsset = {
  ...transactionInitState,
  asset: assets[0].assetHash,
};

export const transactionStateWithReceipient = {
  ...transactionStateWithAsset,
  receipientAddress: Address.create(confidentialAddresses[0].address),
  changeAddress: Address.create(confidentialAddresses[1].address),
  amountInSatoshi: 10000000,
};

export const transactionStateWithFeeChangeAddress = {
  ...transactionStateWithReceipient,
  feeChangeAddress: Address.create(
    confidentialAddresses[1].address,
    confidentialAddresses[1].derivationPath
  ),
};

export const transactionStateWithFees = {
  ...transactionStateWithFeeChangeAddress,
  feeAsset: assets[1].assetHash,
  feeAmountInSatoshi: 138000,
};
