import { FormikProps, withFormik } from 'formik';
import React from 'react';
import * as Yup from 'yup';
import Button from './button';
import Input from './input';
import Modal from './modal';
import { DebouncedFunc } from 'lodash';
interface ModalUnlockFormValues {
  handleModalUnlockClose(): void;
  password: string;
}

interface ModalUnlockFormProps {
  error?: string;
  handleModalUnlockClose(): void;
  handleUnlock: DebouncedFunc<(password: string) => Promise<void>>;
  isModalUnlockOpen: boolean;
}

const ModalUnlockForm = (props: FormikProps<ModalUnlockFormValues>) => {
  const { handleSubmit, values } = props;
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <h2 className="mt-4 text-2xl font-medium text-center">Unlock</h2>
        <p className="mt-10 mb-5 text-base text-left">Enter your password to unlock your wallet</p>
        <Input name="password" placeholder="Password" type="password" {...props} />
      </div>
      <div className="bottom-10 right-8 absolute flex justify-end">
        <div className="pr-1">
          <Button
            isOutline={true}
            onClick={() => values.handleModalUnlockClose()}
            className="bg-secondary hover:bg-secondary-light"
          >
            Cancel
          </Button>
        </div>
        <div>
          <Button type="submit">Unlock</Button>
        </div>
      </div>
    </form>
  );
};

const ModalUnlockEnhancedForm = withFormik<ModalUnlockFormProps, ModalUnlockFormValues>({
  mapPropsToValues: (props): ModalUnlockFormValues => ({
    handleModalUnlockClose: props.handleModalUnlockClose.bind(this),
    password: '',
  }),

  validationSchema: Yup.object().shape({
    password: Yup.string()
      .required('A password is required')
      .min(8, 'Password should be 8 characters minimum'),
  }),

  handleSubmit: async (values, { props, setStatus }) => {
    try {
      await props.handleUnlock(values.password);
    } catch (_) {
      setStatus({ password: 'Invalid password' });
    }
    if (props.error) {
      setStatus({ password: props.error });
    }
  },

  displayName: 'ModalUnlockForm',
})(ModalUnlockForm);

const ModalUnlock: React.FC<ModalUnlockFormProps> = ({
  error,
  handleModalUnlockClose,
  handleUnlock,
  isModalUnlockOpen,
}) => {
  if (!isModalUnlockOpen) {
    return <></>;
  }

  return (
    <Modal isOpen={isModalUnlockOpen} onClose={handleModalUnlockClose}>
      <ModalUnlockEnhancedForm
        error={error}
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={handleUnlock}
      />
    </Modal>
  );
};

export default ModalUnlock;
