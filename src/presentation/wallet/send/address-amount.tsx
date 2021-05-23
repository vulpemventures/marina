import React from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import cx from 'classnames';
import { withFormik, FormikProps } from 'formik';
import * as Yup from 'yup';
import { SEND_CHOOSE_FEE_ROUTE, TRANSACTIONS_ROUTE } from '../../routes/constants';
import { RootReducerState } from '../../../domain/common';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import {
  defaultPrecision,
  imgPathMapMainnet,
  imgPathMapRegtest,
  isValidAddressForNetwork,
  nextAddressForWallet,
} from '../../../application/utils';
import { getMinAmountFromPrecision, fromSatoshi, toSatoshi } from '../../utils';
import { useDispatch, useSelector } from 'react-redux';
import { flushTx, setAddressesAndAmount } from '../../../application/redux/actions/transaction';
import { balances } from '../../../application/redux/selectors/balance.selector';
import { createAddress } from '../../../domain/address';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { setAddress } from '../../../application/redux/actions/wallet';

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
  state: RootReducerState;
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
    address: props.state.transaction.receipientAddress?.value ?? '',
    // Little hack to initialize empty value of type number
    // https://github.com/formium/formik/issues/321#issuecomment-478364302
    amount:
      props.state.transaction.amountInSatoshi > 0
        ? fromSatoshi(props.state.transaction.amountInSatoshi)
        : ('' as unknown as number),
    assetTicker:
      props.state.assets[props.state.app.network][props.state.transaction.asset]?.ticker ?? '',
    assetPrecision:
      props.state.assets[props.state.app.network][props.state.transaction.asset]?.precision ??
      defaultPrecision,
    balances: props.balances,
  }),

  validationSchema: (props: AddressAmountFormProps): any =>
    Yup.object().shape({
      address: Yup.string()
        .required('Please enter a valid address')
        .test(
          'valid-address',
          'Address is not valid',
          (value) => value !== undefined && isValidAddressForNetwork(value, props.state.app.network)
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
            value <=
              fromSatoshi(props.balances[props.state.transaction.asset], props.assetPrecision)
          );
        }),
    }),

  handleSubmit: async (values, { props }) => {
    const { wallet, app } = props.state;
    const changeAddress = await nextAddressForWallet(wallet, app.network, true);
    await props.dispatch(setAddress(changeAddress)); // persist address in wallet

    await props
      .dispatch(
        setAddressesAndAmount(
          createAddress(values.address),
          changeAddress,
          toSatoshi(values.amount)
        )
      )
      .catch(console.error);

    props.history.push({
      pathname: SEND_CHOOSE_FEE_ROUTE,
      state: { changeAddress: changeAddress },
    });
  },
  displayName: 'AddressAmountForm',
})(AddressAmountForm);

const AddressAmount: React.FC = () => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const state = useSelector((state: RootReducerState) => state);
  const assetsBalance = useSelector(balances);
  const { assets, transaction, app } = state;

  const assetTicker =
    assets[app.network][transaction.asset]?.ticker ?? transaction.asset.slice(0, 4);
  const assetPrecision = assets[app.network][transaction.asset]?.precision ?? defaultPrecision;

  const handleBackBtn = () => {
    flushTx(dispatch).catch(console.error);
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: { assetHash: transaction.asset, assetTicker, assetsBalance },
    });
  };

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance
        assetHash={state.transaction.asset}
        assetBalance={fromSatoshi(assetsBalance[state.transaction.asset] ?? 0, assetPrecision)}
        assetImgPath={
          app.network === 'regtest'
            ? imgPathMapRegtest[assetTicker] ?? imgPathMapRegtest['']
            : imgPathMapMainnet[transaction.asset] ?? imgPathMapMainnet['']
        }
        assetTicker={assetTicker}
        className="mt-4"
      />

      <AddressAmountEnhancedForm
        dispatch={dispatch}
        history={history}
        state={state}
        balances={assetsBalance}
        assetPrecision={assetPrecision}
      />
    </ShellPopUp>
  );
};

export default AddressAmount;
