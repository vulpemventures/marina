import type { RouteComponentProps } from 'react-router-dom';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import * as Yup from 'yup';
import { DEFAULT_ROUTE, INITIALIZE_WELCOME_ROUTE } from '../../routes/constants';
import Button from '../../components/button';
import Input from '../../components/input';
import { useDispatch, useSelector } from 'react-redux';
import { logIn } from '../../../application/redux/actions/app';
import { AUTHENTICATION_SUCCESS } from '../../../application/redux/actions/action-types';
import type { PasswordHash } from '../../../domain/password-hash';
import { createPassword } from '../../../domain/password';
import type { RootReducerState } from '../../../domain/common';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import browser from 'webextension-polyfill';
import { reloadAccountsSubscribtionsMsg } from '../../../domain/message';

interface LogInFormValues {
  password: string;
}

interface LogInFormProps {
  dispatch: ProxyStoreDispatch;
  history: RouteComponentProps['history'];
  passwordHash: PasswordHash;
}

const LogInForm: React.FC<FormikProps<LogInFormValues>> = (props) => {
  const { isSubmitting, handleSubmit } = props;

  const openOnboardingTab = async () => {
    const url = browser.runtime.getURL(`home.html#${INITIALIZE_WELCOME_ROUTE}`);
    await browser.tabs.create({ url });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <div className="flex flex-col">
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
        <div className="hover:underline text-primary self-start justify-start font-bold align-bottom">
          <span className="cursor-pointer" onClick={openOnboardingTab}>
            Restore account
          </span>
        </div>
      </div>
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
  handleSubmit: (values, { props, setErrors, setSubmitting }) => {
    const logInAction = logIn(createPassword(values.password), props.passwordHash);
    props
      .dispatch(logInAction)
      .then(() => {
        if (logInAction.type === AUTHENTICATION_SUCCESS) {
          props.dispatch({ type: AUTHENTICATION_SUCCESS }).catch(console.error);
          browser.runtime.connect().postMessage(reloadAccountsSubscribtionsMsg());
          props.history.push(DEFAULT_ROUTE);
        } else {
          const err = logInAction.payload.error;
          setErrors({ password: err.message });
          setSubmitting(false);
        }
      })
      .catch(console.error);
  },
  displayName: 'LogInForm',
})(LogInForm);

const LogIn: React.FC = () => {
  const history = useHistory();
  const passwordHash = useSelector((state: RootReducerState) => state.wallet.passwordHash);
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
      </div>
    </>
  );
};

export default LogIn;
