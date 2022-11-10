import React from 'react';
import { useHistory } from 'react-router-dom';
import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import * as Yup from 'yup';
import Shell from '../../components/shell';
import Input from '../../components/input';
import Button from '../../components/button';
import { INITIALIZE_SEED_PHRASE_ROUTE } from '../../routes/constants';
import { onboardingRepository, useSelectEncryptedMnemonic } from '../../../infrastructure/storage/common';
import { decrypt } from '../../../utils';

interface BackUpUnlockFormValues {
  password: string;
}

interface BackUpUnlockFormProps {
  encryptedMnemonic: string;
  onSuccess: (mnemonicToBackup: string) => Promise<void>;
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
      const mnemonic = decrypt(props.encryptedMnemonic, values.password);
      await props.onSuccess(mnemonic);
    } catch (err) {
      console.error(err);
      setErrors({ password: 'This password is not correct' });
    }
  },

  displayName: 'BackUpUnlockForm',
})(BackUpUnlockForm);

const BackUpUnlock: React.FC = () => {
  const history = useHistory();
  const encryptedMnemonic = useSelectEncryptedMnemonic();
  const onSuccess = async (mnemonic: string) => {
    await onboardingRepository.setIsFromPopupFlow(mnemonic);
    history.push(INITIALIZE_SEED_PHRASE_ROUTE);
  }
 
  return (
    <Shell hasBackBtn={false}>
      {encryptedMnemonic && <BackUpUnlockEnhancedForm
        encryptedMnemonic={encryptedMnemonic}
        onSuccess={onSuccess}
      />}
    </Shell>
  );
};

export default BackUpUnlock;
