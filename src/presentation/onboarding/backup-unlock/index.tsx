import React, { useContext } from 'react';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { FormikProps, withFormik } from 'formik';
import * as Yup from 'yup';
import Shell from '../../components/shell';
import Input from '../../components/input';
import Button from '../../components/button';
import { decrypt } from '../../../application/utils';
import { AppContext } from '../../../application/store/context';
import { EncryptedMnemonic, Password } from '../../../domain/wallet/value-objects';
import { INITIALIZE_SEED_PHRASE_ROUTE } from '../../routes/constants';
import { setIsFromPopupFlow, setRestored } from '../../../application/store/actions/onboarding';
import { DispatchOrThunk } from '../../../domain/common';

interface BackUpUnlockFormValues {
  password: string;
}
interface BackUpUnlockFormProps {
  dispatch(param: DispatchOrThunk): any;
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

  handleSubmit: (values, { props, setErrors }) => {
    try {
      const mnemonic = decrypt(props.encryptedMnemonic, Password.create(values.password));
      props.dispatch(setRestored(values.password, mnemonic.value));
      props.dispatch(setIsFromPopupFlow());
      return props.history.push(INITIALIZE_SEED_PHRASE_ROUTE);
    } catch (err) {
      console.error(err);
      setErrors({ password: 'This password is not correct' });
    }
  },

  displayName: 'BackUpUnlockForm',
})(BackUpUnlockForm);

const BackUpUnlock: React.FC<BackUpUnlockFormProps> = () => {
  const history = useHistory();
  const [{ wallets }, dispatch] = useContext(AppContext);
  const { encryptedMnemonic } = wallets[0];

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
