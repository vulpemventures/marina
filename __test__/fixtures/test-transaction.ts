import { transactionInitState } from '../../src/application/store/reducers/transaction-reducer';
import assets from './assets.json';
import { confidentialAddresses } from './wallet.json';

export const transactionStateWithAsset = {
  ...transactionInitState,
  asset: assets[0].assetHash,
};

export const transactionStateWithReceipient = {
  ...transactionStateWithAsset,
  receipientAddress: confidentialAddresses[0].address,
  changeAddress: confidentialAddresses[1].address,
  amountInSatoshi: 10000000,
};

export const transactionStateWithFeeChangeAddress = {
  ...transactionStateWithReceipient,
  feeChangeAddress: confidentialAddresses[1].address,
};

export const transactionStateWithFees = {
  ...transactionStateWithFeeChangeAddress,
  feeAsset: assets[1].assetHash,
  feeAmountInSatoshi: 138000,
};
