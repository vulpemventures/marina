import React, { useContext } from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import cx from 'classnames';
import { withFormik, FormikProps } from 'formik';
import * as Yup from 'yup';
import { DEFAULT_ROUTE, SEND_CHOOSE_FEE_ROUTE } from '../../routes/constants';
import { AppContext } from '../../../application/background_script';
import { DispatchOrThunk } from '../../../domain/common';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';

interface AddressAmountFormValues {
  address: string;
  amount: number;
}

interface AddressAmountFormProps {
  dispatch(param: DispatchOrThunk): any;
  history: RouteComponentProps['history'];
}

const AddressAmountForm = (props: FormikProps<AddressAmountFormValues>) => {
  const { errors, handleChange, handleBlur, handleSubmit, isSubmitting, touched, values } = props;

  console.log('isSubmitting', isSubmitting);

  console.log(
    '!!(errors.address && touched.address && errors.amount && touched.amount)',
    !!(errors.address && touched.address && errors.amount && touched.amount)
  );

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
              L-BTC
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
    address: '',
    // Little hack to initialize empty value of type number
    // https://github.com/formium/formik/issues/321#issuecomment-478364302
    amount: ('' as unknown) as number,
  }),

  validationSchema: Yup.object().shape({
    // TODO: Test if valid address
    address: Yup.string().required('Please enter an address'),

    amount: Yup.number().required('Please enter an amount'),
  }),

  handleSubmit: (values, { props }) => {
    //props.dispatch(setAddressAndAmount(values.address, values.amount, props.history));
    props.history.push(SEND_CHOOSE_FEE_ROUTE);
  },

  displayName: 'AddressAmountForm',
})(AddressAmountForm);

const AddressAmount: React.FC = () => {
  const history = useHistory();
  const handleBackBtn = () => history.push(DEFAULT_ROUTE);
  const [, dispatch] = useContext(AppContext);

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance liquidBitcoinBalance={0.005} fiatBalance={120} fiatCurrency="$" className="mt-4" />

      <AddressAmountEnhancedForm dispatch={dispatch} history={history} />
    </ShellPopUp>
  );
};

export default AddressAmount;
