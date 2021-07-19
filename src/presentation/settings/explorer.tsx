import React from 'react';
import { RouteComponentProps, useHistory } from 'react-router';
import { FormikProps, withFormik } from 'formik';
import * as Yup from 'yup';
import ShellPopUp from '../components/shell-popup';
import Input from '../components/input';
import Button from '../components/button';
import { useDispatch, useSelector } from 'react-redux';
import { Network } from '../../domain/network';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { RootReducerState } from '../../domain/common';
import { getExplorerURLSelector } from '../../application/redux/selectors/app.selector';
import { setExplorer } from '../../application/redux/actions/app';

interface SettingsExplorerFormValues {
  explorerUrl: string;
  network: Network;
}

interface SettingsExplorerFormProps {
  dispatch: ProxyStoreDispatch;
  history: RouteComponentProps['history'];
  network: Network;
  explorerURL: string;
}

const SettingsExplorerForm = (props: FormikProps<SettingsExplorerFormValues>) => {
  const { handleSubmit, isSubmitting, setFieldValue, submitForm, errors, values } = props;

  const handleUseDefault = async () => {
    let defaultValue = 'https://blockstream.info/liquid/api';
    if (values.network === 'regtest') {
      defaultValue = 'http://localhost:3001';
    }
    setFieldValue('explorerUrl', defaultValue, false);
    // Hack to wait for new value to be applied
    // https://github.com/formium/formik/issues/529
    await Promise.resolve();
    submitForm().catch(console.error);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-regular my-8 text-base text-left">
        Enter the Explorer URL to retrieve Blockchain data
      </p>
      <Input name="explorerUrl" placeholder="Esplora endpoint URL" type="text" {...props} />

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
          <Button disabled={!!errors.explorerUrl || isSubmitting} type="submit">
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
  mapPropsToValues: (props): SettingsExplorerFormValues => ({
    network: props.network,
    explorerUrl: '',
  }),

  validationSchema: Yup.object().shape({
    explorerUrl: Yup.string().required('An explorer URL is required'),
  }),

  handleSubmit: async (values, { props }) => {
    await props.dispatch(setExplorer(values.explorerUrl, props.network));
  },

  displayName: 'SettingsExplorerForm',
})(SettingsExplorerForm);

const SettingsExplorer: React.FC = () => {
  const history = useHistory();
  const app = useSelector((state: RootReducerState) => state.app);
  const explorerURL = useSelector(getExplorerURLSelector);
  const dispatch = useDispatch<ProxyStoreDispatch>();

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Explorer"
    >
      <SettingsExplorerEnhancedForm
        dispatch={dispatch}
        history={history}
        network={app.network}
        explorerURL={explorerURL}
      />
      <p className="mt-2 font-bold">Current explorer</p>
      <p className="font-regular">{explorerURL}</p>
    </ShellPopUp>
  );
};

export default SettingsExplorer;
