import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import type { RouteComponentProps } from 'react-router';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import Button from './button';
import {
  setAddressesAndAmount,
  setPendingTxStep,
} from '../../application/redux/actions/transaction';
import { createAddress } from '../../domain/address';
import { SEND_CHOOSE_FEE_ROUTE } from '../routes/constants';
import * as Yup from 'yup';
import type { TransactionState } from '../../application/redux/reducers/transaction-reducer';
import type { Asset } from '../../domain/assets';
import { updateToNextChangeAddress } from '../../application/redux/actions/wallet';
import type { Account } from '../../domain/account';
import type { NetworkString } from 'ldk';
import { isValidAddressForNetwork } from '../../application/utils/address';
import { fromSatoshi, getMinAmountFromPrecision, toSatoshi } from '../utils';
import Input from './input';
import React from 'react';

interface AddressAmountFormValues {
  address: string;
  amount: string;
  assetTicker: string;
  assetPrecision: number;
  balance: number;
}

interface AddressAmountFormProps {
  balance: number;
  dispatch: ProxyStoreDispatch;
  asset: Asset;
  history: RouteComponentProps['history'];
  transaction: TransactionState;
  network: NetworkString;
  account: Account;
}

/**
 * Sanitize input amount
 * @param eventDetailValue string
 * @returns sanitizedValue string
 */
function sanitizeInputAmount(eventDetailValue: string, precision: number): string {
  // Sanitize value
  let sanitizedValue = eventDetailValue
    // Replace comma by dot
    .replace(',', '.')
    // Remove non-numeric chars or period
    .replace(/[^0-9.]/g, '');
  // Prefix single dot
  if (sanitizedValue === '.') sanitizedValue = '0.';
  // Remove last dot. Remove all if consecutive
  if ((sanitizedValue.match(/\./g) || []).length > 1) {
    sanitizedValue = sanitizedValue.replace(/\.$/, '');
  }
  // No more than max decimal digits for respective unit
  if (eventDetailValue.split(/[,.]/, 2)[1]?.length > precision) {
    sanitizedValue = Number(eventDetailValue).toFixed(precision);
  }

  return sanitizedValue;
}

function isValidAmountString(precision: number, amount?: string) {
  const splitted = amount?.replace(',', '.').split('.');
  if (splitted && splitted.length < 2) return true;
  return splitted !== undefined && splitted[1].length <= precision;
}

const AddressAmountForm = (props: FormikProps<AddressAmountFormValues>) => {
  const { errors, handleSubmit, isSubmitting, touched, values, setFieldValue, setFieldTouched } =
    props;

  const setMaxAmount = () => {
    const maxAmount = values.balance;
    setFieldValue('amount', maxAmount, true);
    setFieldTouched('amount', true, false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <p className="mb-2 text-base font-medium text-left">Address</p>
      <Input name="address" placeholder="" type="text" {...props} />

      <div className="flex content-center justify-between mb-2">
        <p className="text-base font-medium text-left">Amount</p>
        <div className="text-primary text-right">
          <button
            onClick={setMaxAmount}
            className="background-transparent focus:outline-none px-3 py-1 mt-1 mb-1 mr-1 text-xs font-bold uppercase transition-all duration-150 ease-linear outline-none"
            type="button"
          >
            SEND ALL
          </button>
        </div>
      </div>
      <Input
        {...props}
        handleChange={(e: React.ChangeEvent<any>) => {
          const amount = e.target.value as string;
          setFieldValue('amount', sanitizeInputAmount(amount, values.assetPrecision), true);
        }}
        value={values.amount}
        name="amount"
        placeholder="0"
        type="text"
        inputSuffix={values.assetTicker}
        validateOnChange={true}
      />

      <div className="text-right">
        <Button
          className="w-2/5 -mt-2 text-base"
          disabled={
            isSubmitting ||
            !!((errors.address && touched.address) || (errors.amount && touched.amount))
          }
          type="submit"
        >
          Verify
        </Button>
      </div>
    </form>
  );
};

const AddressAmountEnhancedForm = withFormik<AddressAmountFormProps, AddressAmountFormValues>({
  mapPropsToValues: (props: AddressAmountFormProps): AddressAmountFormValues => ({
    address: props.transaction.sendAddress?.value ?? '',
    // Little hack to initialize empty value of type number
    // https://github.com/formium/formik/issues/321#issuecomment-478364302
    amount:
      props.transaction.sendAmount > 0
        ? sanitizeInputAmount((props.transaction.sendAmount ?? 0).toString(), props.asset.precision)
        : '',
    assetTicker: props.asset.ticker ?? '??',
    assetPrecision: props.asset.precision,
    balance: fromSatoshi(props.balance ?? 0, props.asset.precision),
  }),

  validationSchema: (props: AddressAmountFormProps): any =>
    Yup.object().shape({
      address: Yup.string()
        .required('Address is required')
        .test(
          'valid-address',
          'Address is not valid',
          (value) => value !== undefined && isValidAddressForNetwork(value, props.network)
        ),

      amount: Yup.number()
        .required('Amount is required')
        .min(
          getMinAmountFromPrecision(props.asset.precision),
          'Amount should be at least 1 satoshi'
        )
        .test('invalid-amount', 'Invalid amount', (value) =>
          isValidAmountString(props.asset.precision, value?.toString())
        )
        .test('insufficient-funds', 'Insufficient funds', (value) => {
          return value !== undefined && value <= fromSatoshi(props.balance, props.asset.precision);
        }),
    }),

  handleSubmit: async (values, { props }) => {
    const masterPubKey = await props.account.getWatchIdentity(props.network);
    const changeAddressGenerated = await masterPubKey.getNextChangeAddress();
    const changeAddress = createAddress(
      changeAddressGenerated.confidentialAddress,
      changeAddressGenerated.derivationPath
    );

    await Promise.all(
      updateToNextChangeAddress(props.account.getInfo().accountID, props.network).map(
        props.dispatch
      )
    ); // persist address in wallet

    await props
      .dispatch(
        setAddressesAndAmount(
          toSatoshi(Number(values.amount), values.assetPrecision),
          [changeAddress],
          createAddress(values.address)
        )
      )
      .catch(console.error);

    await props.dispatch(setPendingTxStep('address-amount'));
    props.history.push({
      pathname: SEND_CHOOSE_FEE_ROUTE,
    });
  },
  displayName: 'AddressAmountForm',
})(AddressAmountForm);

export default AddressAmountEnhancedForm;
