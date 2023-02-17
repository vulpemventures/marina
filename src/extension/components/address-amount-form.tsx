import { address, networks } from 'liquidjs-lib';
import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import type { RouteComponentProps } from 'react-router';
import Button from './button';
import { SEND_CHOOSE_FEE_ROUTE } from '../routes/constants';
import * as Yup from 'yup';
import type { Asset, NetworkString } from 'marina-provider';
import { fromSatoshi, getMinAmountFromPrecision, toSatoshi } from '../utility';
import Input from './input';
import React from 'react';
import type { SendFlowRepository } from '../../domain/repository';

interface FormValues {
  address: string;
  amount: string;
}

interface FormProps {
  dataInCache: {
    address: string;
    amount: number;
  };
  asset: Asset;
  maxPossibleAmount: number;
  sendFlowRepository: SendFlowRepository;
  history: RouteComponentProps['history'];
  network: NetworkString;
}

const isValidAddressForNetwork = (addr: string, net: NetworkString): boolean => {
  try {
    const network = networks[net];
    if (!network) {
      throw new Error('network not found');
    }
    address.toOutputScript(addr, network);
    return true;
  } catch (ignore) {
    return false;
  }
};

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

const BaseForm = (props: FormProps & FormikProps<FormValues>) => {
  const {
    maxPossibleAmount,
    asset,
    errors,
    handleSubmit,
    isSubmitting,
    touched,
    values,
    setFieldValue,
    setFieldTouched,
  } = props;
  const setMaxAmount = () => {
    const max = fromSatoshi(maxPossibleAmount, asset.precision);
    setFieldValue('amount', max, true);
    setFieldTouched('amount', true, false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <p className="mb-2 text-base font-medium text-left">Address</p>
      <Input {...props} name="address" placeholder="" type="text" value={values.address} />

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
          setFieldValue('amount', sanitizeInputAmount(amount, asset.precision), true);
        }}
        value={values.amount}
        name="amount"
        placeholder="0"
        type="text"
        inputSuffix={asset.ticker}
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

const AddressAmountForm = withFormik<FormProps, FormValues>({
  mapPropsToValues: (props: FormProps): FormValues => ({
    address: props.dataInCache.address ?? '',
    // Little hack to initialize empty value of type number
    // https://github.com/formium/formik/issues/321#issuecomment-478364302
    amount:
      props.dataInCache.amount <= 0
        ? ''
        : sanitizeInputAmount(
            fromSatoshi(props.dataInCache.amount ?? 0, props.asset.precision).toString(),
            props.asset.precision
          ),
  }),

  validationSchema: (props: FormProps): any =>
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
          return (
            value !== undefined &&
            value <= fromSatoshi(props.maxPossibleAmount, props.asset.precision)
          );
        }),
    }),

  handleSubmit: async (values, { props }) => {
    await props.sendFlowRepository.setReceiverAddressAmount(
      values.address,
      toSatoshi(Number(values.amount), props.asset.precision)
    );

    props.history.push({
      pathname: SEND_CHOOSE_FEE_ROUTE,
    });
  },
  displayName: 'AddressAmountForm',
})(BaseForm);

export default AddressAmountForm;
