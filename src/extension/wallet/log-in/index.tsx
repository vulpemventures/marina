import React from 'react';
import { useHistory } from 'react-router-dom';
import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import * as Yup from 'yup';
import { DEFAULT_ROUTE, INITIALIZE_WELCOME_ROUTE } from '../../routes/constants';
import Button from '../../components/button';
import Input from '../../components/input';
import browser from 'webextension-polyfill';
import { INVALID_PASSWORD_ERROR } from '../../../constants';
import { match } from '../../../utils';
import { appRepository, useSelectPasswordHash } from '../../../infrastructure/storage/common';
import Browser from 'webextension-polyfill';
import { logInMessage } from '../../../domain/message';

interface LogInFormValues {
  password: string;
}

interface LogInFormProps {
  passwordHash: string;
  onSuccess: () => Promise<void>;
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
    const authenticated = match(values.password, props.passwordHash);
    if (!authenticated) {
      setErrors({ password: INVALID_PASSWORD_ERROR });
      setSubmitting(false);
    } else {
      props.onSuccess()
    }
    
  },
  displayName: 'LogInForm',
})(LogInForm);

const LogIn: React.FC = () => {
  const history = useHistory();
  const passwordHash = useSelectPasswordHash();

  const onSuccess = async () => { 
    const port = Browser.runtime.connect();
    await appRepository.updateStatus({ isAuthenticated: true });
    port.postMessage(logInMessage());
    history.push(DEFAULT_ROUTE);
  };

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
        <LogInEnhancedForm onSuccess={onSuccess} passwordHash={passwordHash ?? ''} />
      </div>
    </>
  );
};

export default LogIn;
