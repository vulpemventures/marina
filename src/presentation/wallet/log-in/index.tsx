import React from 'react';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { FormikProps, withFormik } from 'formik';
import * as Yup from 'yup';
import { DEFAULT_ROUTE } from '../../routes/constants';
import Button from '../../components/button';
import Input from '../../components/input';
import { ProxyStoreDispatch } from '../..';
import { useDispatch, useSelector } from 'react-redux';
import { logIn } from '../../../application/redux/actions/app';
import { RootState } from '../../../application/redux/store';
import { setIdleAction } from '../../../application/utils';
import {
  AUTHENTICATION_SUCCESS,
  LOGOUT_SUCCESS,
} from '../../../application/redux/actions/action-types';
import { PasswordHash } from '../../../domain/password-hash';
import { createPassword } from '../../../domain/password';

interface LogInFormValues {
  password: string;
}

interface LogInFormProps {
  dispatch: ProxyStoreDispatch;
  history: RouteComponentProps['history'];
  passwordHash: PasswordHash;
}

const LogInForm = (props: FormikProps<LogInFormValues>) => {
  const { isSubmitting, handleSubmit } = props;

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <Input
        name="password"
        type="password"
        placeholder="Enter your password"
        title="Password"
        {...props}
      />
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
      .min(8, 'Password should be 8 characters minimum.'),
  }),

  handleSubmit: async (values, { props, setErrors, setSubmitting }) => {
    const logInAction = logIn(createPassword(values.password), props.passwordHash);
    await props.dispatch(logInAction);

    if (logInAction.type === AUTHENTICATION_SUCCESS) {
      props.history.push(DEFAULT_ROUTE);
      setIdleAction(() => {
        props.dispatch({ type: LOGOUT_SUCCESS });
      });
    } else {
      const err = logInAction.payload.error;
      setErrors({ password: err.message });
      setSubmitting(false);
      console.error(logInAction.payload.error);
    }
  },
  displayName: 'LogInForm',
})(LogInForm);

const LogIn: React.FC = () => {
  const history = useHistory();
  const passwordHash = useSelector((state: RootState) => state.wallets[0].passwordHash);
  const dispatch = useDispatch<ProxyStoreDispatch>();

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
        <h2 className="text-grayLight text-lg font-medium">
          The ultimate gateway to access the Liquid Network
        </h2>
        <LogInEnhancedForm dispatch={dispatch} history={history} passwordHash={passwordHash} />
        {/* <Link className="text-primary block font-bold text-left" to={RESTORE_VAULT_ROUTE}>
          Restore account
        </Link> */}
      </div>
    </>
  );
};

export default LogIn;
