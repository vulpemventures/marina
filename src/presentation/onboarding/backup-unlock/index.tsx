import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { useHistory } from 'react-router-dom';
import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import * as Yup from 'yup';
import Shell from '../../components/shell';
import Input from '../../components/input';
import Button from '../../components/button';
import { decrypt } from '../../../application/utils/crypto';
import { INITIALIZE_SEED_PHRASE_ROUTE } from '../../routes/constants';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import type { EncryptedMnemonic } from '../../../domain/encrypted-mnemonic';
import { useDispatch, useSelector } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import { createPassword } from '../../../domain/password';
import { setBackup } from '../../../application/redux/actions/onboarding';

interface BackUpUnlockFormValues {
  password: string;
}
interface BackUpUnlockFormProps {
  dispatch: ProxyStoreDispatch;
  encryptedMnemonic: EncryptedMnemonic;
  history: RouteComponentProps['history'];
}

const BackUpUnlockForm = (props: FormikProps<BackUpUnlockFormValues>) => {
  const { handleSubmit, isSubmitting } = props;
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <h1 className="text-3xl font-medium">Unlock</h1>
        <p className="mt-10 mb-5 text-base">Enter your password to save your mnemonic</p>
        <Input name="password" placeholder="Password" type="password" {...props} />
      </div>
      <div className="">
        <Button type="submit" disabled={isSubmitting}>
          {!isSubmitting ? `Unlock` : `Please wait...`}
        </Button>
      </div>
    </form>
  );
};

const BackUpUnlockEnhancedForm = withFormik<BackUpUnlockFormProps, BackUpUnlockFormValues>({
  mapPropsToValues: (): BackUpUnlockFormValues => ({
    password: '',
  }),

  validationSchema: Yup.object().shape({
    password: Yup.string()
      .required('A password is required')
      .min(8, 'Password should be 8 characters minimum'),
  }),

  handleSubmit: async (values, { props, setErrors }) => {
    try {
      const mnemonic = decrypt(props.encryptedMnemonic, createPassword(values.password));
      await props.dispatch(setBackup(mnemonic));
      return props.history.push(INITIALIZE_SEED_PHRASE_ROUTE);
    } catch (err) {
      console.error(err);
      setErrors({ password: 'This password is not correct' });
    }
  },

  displayName: 'BackUpUnlockForm',
})(BackUpUnlockForm);

const BackUpUnlock: React.FC = () => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const encryptedMnemonic = useSelector((s: RootReducerState) => s.wallet.encryptedMnemonic);

  return (
    <Shell hasBackBtn={false}>
      <BackUpUnlockEnhancedForm
        dispatch={dispatch}
        encryptedMnemonic={encryptedMnemonic}
        history={history}
      />
    </Shell>
  );
};

export default BackUpUnlock;
