import React from 'react';
import { useHistory, RouteComponentProps } from 'react-router-dom';
import cx from 'classnames';
import { withFormik, FormikProps } from 'formik';
import * as Yup from 'yup';
import Button from '../../components/button';
import Shell from '../../components/shell';
import { IError } from '../../../domain/common';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../../routes/constants';
import { setRestored } from '../../../application/store/actions/onboarding';
import { ProxyStoreDispatch } from '../..';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../application/store/store';

interface WalletRestoreFormValues {
  mnemonic: string;
  password: string;
  confirmPassword: string;
  ctxErrors?: Record<string, IError>;
}

interface WalletRestoreFormProps {
  ctxErrors?: Record<string, IError>;
  dispatch: ProxyStoreDispatch;
  history: RouteComponentProps['history'];
}

const WalletRestoreForm = (props: FormikProps<WalletRestoreFormValues>) => {
  const { values, touched, errors, isSubmitting, handleChange, handleBlur, handleSubmit } = props;

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <div
        className={cx({
          'mb-12': !values.ctxErrors && (!errors.mnemonic || !touched.mnemonic),
        })}
      >
        <textarea
          id="mnemonic"
          name="mnemonic"
          onChange={handleChange}
          onBlur={handleBlur}
          rows={5}
          className={cx(
            'border-2 focus:ring-primary focus:border-primary sm:text-sm placeholder-grayLight block w-3/5 rounded-md shadow-sm',
            {
              'border-red': errors.mnemonic && touched.mnemonic,
              'border-grayLight': !errors.mnemonic,
            }
          )}
          placeholder="Enter your mnemonic phrase"
          value={values.mnemonic}
        />
        {(errors.mnemonic && touched.mnemonic && (
          <p className="text-red h-10 mt-2 text-xs">{errors.mnemonic}</p>
        )) ||
          (values.ctxErrors && (
            <p className="text-red h-10 mt-2 text-xs">{values.ctxErrors?.restore?.message}</p>
          ))}
      </div>

      <div className={cx({ 'mb-12': !errors.password || !touched.password })}>
        <label className="block">
          <p className="mb-2 font-medium">Password</p>
          <input
            className={cx(
              'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 rounded-md',
              {
                'border-red': errors.password && touched.password,
                'border-grayLight': !errors.password,
              }
            )}
            id="password"
            name="password"
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your password"
            type="password"
            value={values.password}
          />
        </label>
        {errors.password && touched.password && (
          <p className="text-red h-10 mt-2 text-xs">{errors.password}</p>
        )}
      </div>

      <div className={cx({ 'mb-12': !errors.confirmPassword || !touched.confirmPassword })}>
        <label className="block">
          <p className="mb-2 font-medium">Confirm Password</p>
          <input
            className={cx(
              'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 rounded-md',
              {
                'border-red': errors.confirmPassword && touched.confirmPassword,
                'border-grayLight': !errors.confirmPassword,
              }
            )}
            id="confirmPassword"
            name="confirmPassword"
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Confirm your password"
            type="password"
            value={values.confirmPassword}
          />
        </label>
        {errors.confirmPassword && touched.confirmPassword && (
          <p className="text-red h-10 mt-2 text-xs">{errors.confirmPassword}</p>
        )}
      </div>

      <Button className="w-1/5 text-base" disabled={isSubmitting} type="submit">
        Restore
      </Button>
    </form>
  );
};

const WalletRestoreEnhancedForm = withFormik<WalletRestoreFormProps, WalletRestoreFormValues>({
  // Necessary to have ctxErrors as value in WalletRestoreForm
  enableReinitialize: true,

  mapPropsToValues: (props: WalletRestoreFormProps): WalletRestoreFormValues => ({
    confirmPassword: '',
    ctxErrors: props.ctxErrors,
    mnemonic: '',
    password: '',
  }),

  validationSchema: Yup.object().shape({
    mnemonic: Yup.string()
      .required('Please input mnemonic')
      .test(
        'valid-mnemonic',
        'mnemonic is not valid - should be 12 or 24 words separated by spaces',
        (value) => value?.trim().split(' ').length === 12 || value?.trim().split(' ').length === 24
      ),

    password: Yup.string()
      .required('Please input password')
      .min(8, 'Password is too short - should be 8 chars minimum.'),

    confirmPassword: Yup.string()
      .required('Please confirm password')
      .min(8, 'Password is too short - should be 8 chars minimum.')
      .oneOf([Yup.ref('password'), null], 'Passwords must match'),
  }),

  handleSubmit: (values, { props }) => {
    props.dispatch(setRestored(values.password, values.mnemonic));
    props.history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  },

  displayName: 'WalletRestoreForm',
})(WalletRestoreForm);

const WalletRestore: React.FC<WalletRestoreFormProps> = () => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const errors = useSelector((state: RootState) => state.wallets[0]?.errors);

  return (
    <Shell>
      <h2 className="mb-4 text-3xl font-medium">{'Restore a wallet from a mnemonic phrase'}</h2>
      <p>{'Enter your secret twelve words of your mnemonic phrase to Restore your wallet'}</p>
      <WalletRestoreEnhancedForm ctxErrors={errors} dispatch={dispatch} history={history} />
    </Shell>
  );
};

export default WalletRestore;
