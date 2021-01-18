import React, { useContext, useEffect } from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import { FormikProps, withFormik } from 'formik';
import * as Yup from 'yup';
import ShellPopUp from '../components/shell-popup';
import Input from '../components/input';
import { DispatchOrThunk } from '../../domain/common';
import { DEFAULT_ROUTE } from '../routes/constants';
import { AppContext } from '../../application/background_script';
import Button from '../components/button';

interface SettingsExplorerFormValues {
  explorerUrl: string;
}

interface SettingsExplorerFormProps {
  dispatch(param: DispatchOrThunk): any;
  history: RouteComponentProps['history'];
}

const SettingsExplorerForm = (props: FormikProps<SettingsExplorerFormValues>) => {
  const { handleSubmit, setFieldValue, submitForm, errors } = props;

  const defaultExplorer = 'https://blockstream.info/liquid';
  const handleUseDefault = async () => {
    setFieldValue('explorerUrl', defaultExplorer, false);
    // Hack to wait for new value to be applied
    // https://github.com/formium/formik/issues/529
    await Promise.resolve();
    submitForm().catch(console.log);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-regular my-8 text-base text-left">
        Enter the Explorer URL to retrieve Blockchain data
      </p>
      <Input name="explorerUrl" placeholder="Explorer URL" type="text" {...props} />

      <div className="bottom-20 right-8 absolute flex justify-end">
        <div className="pr-1">
          <Button
            isOutline={true}
            onClick={handleUseDefault}
            className="bg-secondary hover:bg-secondary-light"
          >
            Use default
          </Button>
        </div>
        <div>
          <Button disabled={!!errors.explorerUrl} type="submit">
            Update
          </Button>
        </div>
      </div>
    </form>
  );
};

const SettingsExplorerEnhancedForm = withFormik<
  SettingsExplorerFormProps,
  SettingsExplorerFormValues
>({
  mapPropsToValues: (): SettingsExplorerFormValues => ({
    explorerUrl: '',
  }),

  validationSchema: Yup.object().shape({
    explorerUrl: Yup.string().required('An explorer URL is required').url('Invalid URL'),
  }),

  handleSubmit: (values, { props }) => {
    console.log('submit');
    //props.history.push(DEFAULT_ROUTE);
  },

  displayName: 'SettingsExplorerForm',
})(SettingsExplorerForm);

const SettingsExplorer: React.FC = () => {
  const history = useHistory();
  const [, dispatch] = useContext(AppContext);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Explorer"
    >
      <SettingsExplorerEnhancedForm dispatch={dispatch} history={history} />
    </ShellPopUp>
  );
};

export default SettingsExplorer;
