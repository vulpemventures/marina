import React, { useContext, useEffect, useState } from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import cx from 'classnames';
import { withFormik, FormikProps } from 'formik';
import * as Yup from 'yup';
import { SEND_CHOOSE_FEE_ROUTE, TRANSACTIONS_ROUTE } from '../../routes/constants';
import { AppContext } from '../../../application/store/context';
import { DispatchOrThunk, IAppState } from '../../../domain/common';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { getAllAssetBalances, setAddressesAndAmount } from '../../../application/store/actions';
import {
  imgPathMapMainnet,
  imgPathMapRegtest,
  isValidAddressForNetwork,
  nextAddressForWallet,
} from '../../../application/utils';
import { Address } from '../../../domain/wallet/value-objects';

interface AddressAmountFormValues {
  address: string;
  amount: number;
  assetTicker: string;
}

interface AddressAmountFormProps {
  dispatch(param: DispatchOrThunk): any;
  history: RouteComponentProps['history'];
  state: IAppState;
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
        ? props.state.transaction.amountInSatoshi / Math.pow(10, 8)
        : (('' as unknown) as number),
    assetTicker:
      props.state.assets[props.state.app.network.value][props.state.transaction.asset]?.ticker ??
      '',
  }),

  validationSchema: (props: AddressAmountFormProps): any =>
    Yup.object().shape({
      address: Yup.string()
        .required('Please enter a valid address')
        .test(
          'valid-address',
          'Address is not valid',
          (value) =>
            value !== undefined && isValidAddressForNetwork(value, props.state.app.network.value)
        ),

      amount: Yup.number()
        .required('Please enter a valid amount')
        .min(0.00000001, 'Amount should be at least 1 satoshi')
        .test('insufficient-funds', 'Insufficient funds', (value) => {
          return (
            value !== undefined &&
            new Promise((resolve, reject) => {
              props.dispatch(
                getAllAssetBalances(
                  (balances) =>
                    resolve(value <= balances[props.state.transaction.asset] / Math.pow(10, 8)),
                  () => reject('Something went wrong')
                )
              );
            })
          );
        }),
    }),

  handleSubmit: async (values, { props }) => {
    const { wallets, app } = props.state;
    // we don't want to dispatch a deriveNewAddress here, because it would
    // persist the derived change address. This could lead to potential unused
    // addresses in case the user goes back to select-asset and then returns to
    // this view. We'll derive the address when persisting the pending tx.
    const changeAddress = await nextAddressForWallet(wallets[0], app.network.value, true);
    props.dispatch(
      setAddressesAndAmount(
        Address.create(values.address),
        Address.create(changeAddress.value),
        values.amount * Math.pow(10, 8)
      )
    );
    props.history.push(SEND_CHOOSE_FEE_ROUTE);
  },

  displayName: 'AddressAmountForm',
})(AddressAmountForm);

const AddressAmount: React.FC = () => {
  const history = useHistory();
  const [state, dispatch] = useContext(AppContext);
  const [balances, setBalances] = useState<{ [assetHash: string]: number }>({});
  const assetTicker = state.assets[state.app.network.value][state.transaction.asset]?.ticker ?? '';

  const handleBackBtn = () => {
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: { assetHash: state.transaction.asset, assetTicker },
    });
  };

  useEffect(() => {
    dispatch(
      getAllAssetBalances(
        (b) => setBalances(b),
        (error) => console.log(error)
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance
        assetBalance={(balances[state.transaction.asset] ?? 0) / Math.pow(10, 8)}
        assetImgPath={
          state.app.network.value === 'regtest'
            ? imgPathMapRegtest[assetTicker] ?? imgPathMapRegtest['']
            : imgPathMapMainnet[state.transaction.asset] ?? imgPathMapMainnet['']
        }
        assetTicker={assetTicker}
        className="mt-4"
        fiatBalance={120}
        fiatCurrency="$"
      />

      <AddressAmountEnhancedForm dispatch={dispatch} history={history} state={state} />
    </ShellPopUp>
  );
};

export default AddressAmount;
