import React from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import { FormikProps, withFormik } from 'formik';
import * as Yup from 'yup';
import ShellPopUp from '../components/shell-popup';
import Button from '../components/button';
import Input from '../components/input';
import { DEFAULT_ROUTE } from '../routes/constants';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';

interface SettingsChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface SettingsChangePasswordFormProps {
  dispatch: ProxyStoreDispatch;
  history: RouteComponentProps['history'];
}

const SettingsChangePasswordForm = (props: FormikProps<SettingsChangePasswordFormValues>) => {
  const { handleSubmit, errors, isSubmitting, touched } = props;
  const history = useHistory();
  const handleCancel = () => history.goBack();

  return (
    <form onSubmit={handleSubmit} className="mt-5">
      <Input
        name="currentPassword"
        placeholder="Enter current password"
        title="Create password"
        type="password"
        {...props}
      />
      <Input
        name="newPassword"
        placeholder="Enter new password"
        title="New password"
        type="password"
        {...props}
      />
      <Input
        name="confirmNewPassword"
        placeholder="Confirm new password"
        title="Confirm new password"
        type="password"
        {...props}
      />

      <div className="flex justify-end">
        <div className="pr-1">
          <Button
            isOutline={true}
            onClick={handleCancel}
            className="bg-secondary hover:bg-secondary-light"
          >
            Cancel
          </Button>
        </div>
        <div>
          <Button
            disabled={
              isSubmitting ||
              !!(
                (errors.currentPassword && touched.currentPassword) ||
                (errors.newPassword && touched.newPassword) ||
                (errors.confirmNewPassword && touched.confirmNewPassword)
              )
            }
            type="submit"
          >
            Update
          </Button>
        </div>
      </div>
    </form>
  );
};

const SettingsChangePasswordEnhancedForm = withFormik<
  SettingsChangePasswordFormProps,
  SettingsChangePasswordFormValues
>({
  mapPropsToValues: (): SettingsChangePasswordFormValues => ({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  }),

  validationSchema: Yup.object().shape({
    currentPassword: Yup.string()
      .required('Please input password')
      .min(8, 'Password is too short - should be 8 chars minimum.'),
    newPassword: Yup.string()
      .required('Please input password')
      .min(8, 'Password is too short - should be 8 chars minimum.'),
    confirmNewPassword: Yup.string()
      .required('Please confirm password')
      .min(8, 'Password is too short - should be 8 chars minimum.')
      .oneOf([Yup.ref('newPassword'), null], 'Passwords must match'),
  }),

  handleSubmit: (values, { props }) => {
    props.history.push(DEFAULT_ROUTE);
  },

  displayName: 'SettingsChangePasswordForm',
})(SettingsChangePasswordForm);

const SettingsChangePassword: React.FC = () => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto bg-bottom bg-no-repeat"
      currentPage="Change password"
    >
      <SettingsChangePasswordEnhancedForm dispatch={dispatch} history={history} />
    </ShellPopUp>
  );
};

export default SettingsChangePassword;
