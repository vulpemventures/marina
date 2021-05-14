import React, { useContext } from 'react';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { FormikProps, withFormik } from 'formik';
import * as Yup from 'yup';
import { logIn } from '../../../application/redux/actions';
import { DEFAULT_ROUTE } from '../../routes/constants';
import Button from '../../components/button';
import Input from '../../components/input';
import { ProxyStoreDispatch } from '../..';
import { useDispatch } from 'react-redux';

interface LogInFormValues {
  password: string;
}

interface LogInFormProps {
  dispatch: ProxyStoreDispatch;
  history: RouteComponentProps['history'];
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

  handleSubmit: (values, { props, setErrors, setSubmitting }) => {
    const onSuccess = () => {
      props.history.push(DEFAULT_ROUTE);
    };
    const onError = (err: Error) => {
      setErrors({ password: err.message });
      setSubmitting(false);
      console.log(err);
    };
    props.dispatch(logIn(values.password, onSuccess, onError));
  },
  displayName: 'LogInForm',
})(LogInForm);

const LogIn: React.FC = () => {
  const history = useHistory();
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
        <LogInEnhancedForm dispatch={dispatch} history={history} />
        {/* <Link className="text-primary block font-bold text-left" to={RESTORE_VAULT_ROUTE}>
          Restore account
        </Link> */}
      </div>
    </>
  );
};

export default LogIn;
