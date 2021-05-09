import React, { useContext } from 'react';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { FormikProps, withFormik } from 'formik';
import * as Yup from 'yup';
import cx from 'classnames';
import Button from '../../components/button';
import Shell from '../../components/shell';
import { AppContext } from '../../../application/store/context';
import { INITIALIZE_SEED_PHRASE_ROUTE, SETTINGS_TERMS_ROUTE } from '../../routes/constants';
import { DispatchOrThunk } from '../../../domain/common';
import { setPassword } from '../../../application/store/actions/onboarding';

interface WalletCreateFormValues {
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface WalletCreateFormProps {
  dispatch(param: DispatchOrThunk): any;
  history: RouteComponentProps['history'];
}

const WalletCreateForm = (props: FormikProps<WalletCreateFormValues>) => {
  const { values, touched, errors, isSubmitting, handleChange, handleBlur, handleSubmit } = props;

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <div className={cx({ 'mb-12': !errors.password || !touched.password })}>
        <label className="block">
          <p className="mb-2 font-medium">Create password</p>
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
          <p className="mb-2 font-medium">Confirm password</p>
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

      <div className={cx({ 'mb-12': !errors.acceptTerms || !touched.acceptTerms })}>
        <label htmlFor="acceptTerms" className="text-grayLight block text-base">
          <input
            className="focus:ring-primary text-primary border-grayLight w-4 h-4 mr-2 text-base rounded"
            checked={values.acceptTerms}
            id="acceptTerms"
            name="acceptTerms"
            onChange={handleChange}
            onBlur={handleBlur}
            type="checkbox"
          />
          {'I’ve read and accept the '}
          <OpenTerms />
        </label>
        {errors.acceptTerms && touched.acceptTerms && (
          <p className="text-red h-10 mt-2 text-xs">{errors.acceptTerms}</p>
        )}
      </div>

      <Button className="w-1/5 text-base" disabled={isSubmitting} type="submit">
        Create
      </Button>
    </form>
  );
};

const WalletCreateEnhancedForm = withFormik<WalletCreateFormProps, WalletCreateFormValues>({
  mapPropsToValues: (): WalletCreateFormValues => ({
    confirmPassword: '',
    password: '',
    acceptTerms: false,
  }),

  validationSchema: Yup.object().shape({
    password: Yup.string()
      .required('Please input password')
      .min(8, 'Password is too short - should be 8 chars minimum.'),
    confirmPassword: Yup.string()
      .required('Please confirm password')
      .min(8, 'Password is too short - should be 8 chars minimum.')
      .oneOf([Yup.ref('password'), null], 'Passwords must match'),
    acceptTerms: Yup.bool().oneOf([true], 'Accepting Terms & Conditions is required'),
  }),

  handleSubmit: (values, { props }) => {
    props.dispatch(setPassword(values.password));
    props.history.push(INITIALIZE_SEED_PHRASE_ROUTE);
  },

  displayName: 'WalletCreateForm',
})(WalletCreateForm);

const WalletCreate: React.FC<WalletCreateFormProps> = () => {
  const history = useHistory();
  const [, dispatch] = useContext(AppContext);
  return (
    <Shell className="space-y-10">
      <h1 className="mb-5 text-3xl font-medium">Create password</h1>
      <WalletCreateEnhancedForm dispatch={dispatch} history={history} />
    </Shell>
  );
};

const OpenTerms: React.FC = () => {
  const history = useHistory();

  const handleClick = (e: any) => {
    e.preventDefault();

    history.push({
      pathname: SETTINGS_TERMS_ROUTE,
      state: { isFullScreen: true },
    });
  };

  return (
    /* eslint-disable-next-line jsx-a11y/anchor-is-valid */
    <a className="text-primary" href="#" onClick={handleClick}>
      terms os service
    </a>
  );
};

export default WalletCreate;
