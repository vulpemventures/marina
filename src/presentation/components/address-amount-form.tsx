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

interface AddressAmountFormValues {
  address: string;
  amount: number;
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

const AddressAmountForm = (props: FormikProps<AddressAmountFormValues>) => {
  const { errors, handleSubmit, isSubmitting, touched, values, setFieldValue, setFieldTouched } =
    props;

  const setMaxAmount = () => {
    const maxAmount = values.balance;
    setFieldValue('amount', maxAmount);
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
        name="amount"
        placeholder="0"
        type="number"
        inputSuffix={values.assetTicker}
        validateOnChange={true}
        step={getMinAmountFromPrecision(values.assetPrecision).toString()}
        {...props}
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
        ? (props.transaction.sendAmount ?? 0) * 10 ** props.asset.precision
        : ('' as unknown as number),
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
        .test(
          'too-many-decimals',
          `Too many decimals (precision: ${props.asset.precision})`,
          (value) => {
            const splitted = value?.toString(10).replace(',', '.').split('.');
            if (splitted && splitted.length < 2) return true;
            return splitted !== undefined && splitted[1].length <= props.asset.precision;
          }
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
          toSatoshi(values.amount, values.assetPrecision),
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
