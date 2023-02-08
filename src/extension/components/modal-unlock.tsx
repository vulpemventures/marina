import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import React, { useRef } from 'react';
import * as Yup from 'yup';
import Button from './button';
import Input from './input';
import Modal from './modal';
import { debounce } from 'lodash';
import ButtonsAtBottom from './buttons-at-bottom';

interface ModalUnlockFormValues {
  handleModalUnlockClose(): void;
  password: string;
}

interface ModalUnlockFormProps {
  handleModalUnlockClose(): void;
  handleUnlock: (password: string) => Promise<void>;
  isModalUnlockOpen: boolean;
}

const ModalUnlockForm = (props: FormikProps<ModalUnlockFormValues>) => {
  const { handleSubmit, values, isSubmitting } = props;
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <h2 className="mt-4 text-2xl font-medium text-center">Unlock</h2>
        <p className="mt-10 mb-5 text-base text-left">Enter your password to unlock your wallet</p>
        <Input name="password" placeholder="Password" type="password" {...props} />
      </div>
      <ButtonsAtBottom>
        <Button
          isOutline={true}
          onClick={() => values.handleModalUnlockClose()}
          className="bg-secondary hover:bg-secondary-light"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {!isSubmitting ? `Unlock` : `Loading...`}
        </Button>
      </ButtonsAtBottom>
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

  handleSubmit: async (values, { props }) => {
    return await props.handleUnlock(values.password);
  },

  displayName: 'ModalUnlockForm',
})(ModalUnlockForm);

const ModalUnlock: React.FC<ModalUnlockFormProps> = ({
  handleModalUnlockClose,
  handleUnlock,
  isModalUnlockOpen,
}) => {
  const deboundedHandleUnlock = useRef(
    debounce(handleUnlock, 2000, { leading: true, trailing: false })
  );

  if (!isModalUnlockOpen) return <></>;
  return (
    <Modal isOpen={isModalUnlockOpen} onClose={handleModalUnlockClose}>
      <ModalUnlockEnhancedForm
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={deboundedHandleUnlock.current}
      />
    </Modal>
  );
};

export default ModalUnlock;
