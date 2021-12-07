import { FormikProps, withFormik } from 'formik';
import {
  masterPubKeyRestorerFromState,
  MasterPublicKey,
  NetworkString,
  StateRestorerOpts,
} from 'ldk';
import { RouteComponentProps } from 'react-router';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import cx from 'classnames';
import Button from './button';
import { setAddressesAndAmount } from '../../application/redux/actions/transaction';
import { createAddress } from '../../domain/address';
import { fromSatoshi, getMinAmountFromPrecision, toSatoshi } from '../utils';
import { SEND_CHOOSE_FEE_ROUTE } from '../routes/constants';
import { defaultPrecision, isValidAddressForNetwork } from '../../application/utils';
import * as Yup from 'yup';
import { TransactionState } from '../../application/redux/reducers/transaction-reducer';
import { IAssets } from '../../domain/assets';
import { incrementChangeAddressIndex } from '../../application/redux/actions/wallet';

interface AddressAmountFormValues {
  address: string;
  amount: number;
  assetTicker: string;
  assetPrecision: number;
  balances: { [assetHash: string]: number };
}

interface AddressAmountFormProps {
  balances: { [assetHash: string]: number };
  dispatch: ProxyStoreDispatch;
  assetPrecision: number;
  history: RouteComponentProps['history'];
  pubKey: MasterPublicKey;
  restorerOpts: StateRestorerOpts;
  transaction: TransactionState;
  assets: IAssets;
  network: NetworkString;
}

const AddressAmountForm = (props: FormikProps<AddressAmountFormValues>) => {
  const { errors, handleChange, handleBlur, handleSubmit, isSubmitting, touched, values } = props;

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <div className={cx({ 'mb-12': !errors.address || !touched.address })}>
        <label className="block">
          <p className="mb-2 text-base font-medium text-left">Address</p>
          <input
            className={cx(
              'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-full rounded-md',
              {
                'border-red': errors.address && touched.address,
                'border-grayLight': !errors.address || !touched.address,
              }
            )}
            id="address"
            name="address"
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder=""
            type="text"
            value={values.address}
          />
        </label>
        {errors.address && touched.address && (
          <p className="text-red h-10 mt-2 text-xs font-medium text-left">{errors.address}</p>
        )}
      </div>

      <div className={cx({ 'mb-12': !errors.amount || !touched.amount })}>
        <label className="block">
          <p className="mb-2 text-base font-medium text-left">Amount</p>
          <div
            className={cx('focus-within:text-grayDark text-grayLight relative w-full', {
              'text-grayDark': touched.amount,
            })}
          >
            <input
              className={cx(
                'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-full rounded-md',
                {
                  'border-red': errors.amount && touched.amount,
                  'border-grayLight': !errors.amount || !touched.amount,
                }
              )}
              id="amount"
              name="amount"
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0"
              type="number"
              value={values.amount}
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-base font-medium">
              {values.assetTicker}
            </span>
          </div>
        </label>
        {errors.amount && touched.amount && (
          <p className="text-red h-10 mt-2 text-xs font-medium text-left">{errors.amount}</p>
        )}
      </div>

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
        ? fromSatoshi(
            props.transaction.sendAmount,
            props.assets[props.transaction.sendAsset].precision
          )
        : ('' as unknown as number),
    assetTicker: props.assets[props.transaction.sendAsset]?.ticker ?? '',
    assetPrecision: props.assets[props.transaction.sendAsset]?.precision ?? defaultPrecision,
    balances: props.balances,
  }),

  validationSchema: (props: AddressAmountFormProps): any =>
    Yup.object().shape({
      address: Yup.string()
        .required('Please enter a valid address')
        .test(
          'valid-address',
          'Address is not valid',
          (value) => value !== undefined && isValidAddressForNetwork(value, props.network)
        ),

      amount: Yup.number()
        .required('Please enter a valid amount')
        .min(getMinAmountFromPrecision(props.assetPrecision), 'Amount should be at least 1 satoshi')
        .test('too-many-digits', 'Too many digits', (value) => {
          return value !== undefined && value.toString().length < 14;
        })
        .test('insufficient-funds', 'Insufficient funds', (value) => {
          return (
            value !== undefined &&
            value <= fromSatoshi(props.balances[props.transaction.sendAsset], props.assetPrecision)
          );
        }),
    }),

  handleSubmit: async (values, { props }) => {
    const masterPubKey = await masterPubKeyRestorerFromState(props.pubKey)(props.restorerOpts);
    const changeAddressGenerated = await masterPubKey.getNextChangeAddress();
    const changeAddress = createAddress(
      changeAddressGenerated.confidentialAddress,
      changeAddressGenerated.derivationPath
    );

    await props.dispatch(incrementChangeAddressIndex()); // persist address in wallet

    await props
      .dispatch(
        setAddressesAndAmount(
          createAddress(values.address),
          changeAddress,
          toSatoshi(values.amount, values.assetPrecision)
        )
      )
      .catch(console.error);

    props.history.push({
      pathname: SEND_CHOOSE_FEE_ROUTE,
    });
  },
  displayName: 'AddressAmountForm',
})(AddressAmountForm);

export default AddressAmountEnhancedForm;
