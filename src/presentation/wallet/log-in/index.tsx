import React, { useContext } from 'react';
import { Link, RouteComponentProps, useHistory } from 'react-router-dom';
import cx from 'classnames';
import { FormikProps, withFormik } from 'formik';
import * as Yup from 'yup';
import { AppContext } from '../../../application/background_script';
import { logIn } from '../../../application/store/actions';
import { RESTORE_VAULT_ROUTE } from '../../routes/constants';
import Button from '../../components/button';
import { DispatchOrThunk } from '../../../domain/common';

interface LogInFormValues {
  password: string;
}

interface LogInFormProps {
  dispatch(param: DispatchOrThunk): any;
  history: RouteComponentProps['history'];
}

const LogInForm = (props: FormikProps<LogInFormValues>) => {
  const { values, touched, errors, isSubmitting, handleChange, handleBlur, handleSubmit } = props;

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <label className="block">
        <p className="mb-2 font-medium text-left">Password</p>
        <input
          className={cx(
            'border-2 focus:ring-primary focus:border-primary placeholder-grayLight w-full mb-5 rounded-md',
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
      <Button className="w-full mb-8 text-base" disabled={isSubmitting} type="submit">
        Log in
      </Button>
    </form>
  );
};

const LogInEnhancedForm = withFormik<LogInFormProps, LogInFormValues>({
  mapPropsToValues: (): LogInFormValues => ({
    password: '',
  }),

  validationSchema: Yup.object().shape({
    password: Yup.string()
      .required('Please input password')
      .min(8, 'Password is too short - should be 8 chars minimum.'),
  }),

  handleSubmit: (values, { props }) => {
    props.dispatch(logIn(values.password, props.history));
  },

  displayName: 'LogInForm',
})(LogInForm);

const LogIn: React.FC = () => {
  const history = useHistory();
  const [, dispatch] = useContext(AppContext);

  return (
    <>
      <div className="scale-x-1 transform">
        <img
          className="transform rotate-180"
          src="/assets/images/popup/bg-sm.png"
          alt="green waves"
        />
      </div>
      <div className="container mx-auto text-center">
        <img
          className="block w-16 mx-auto mb-6"
          src="/assets/images/marina-logo.svg"
          alt="marina logo"
        />
        <h1 className="text-4xl font-medium">Marina</h1>
        <h2 className="text-grayLight text-lg font-medium">Be your own bank</h2>
        <LogInEnhancedForm dispatch={dispatch} history={history} />
        <Link className="text-primary block font-bold text-left" to={RESTORE_VAULT_ROUTE}>
          Restore account
        </Link>
      </div>
    </>
  );
};

export default LogIn;
