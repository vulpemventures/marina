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
import { setExplorer, setWebExplorer } from '../../application/redux/actions/app';
import Select from '../components/select';

interface SettingsExplorerFormValues {
  explorerURL: string;
  webExplorerURL: string;
  network: Network;
}

interface SettingsExplorerFormProps {
  dispatch: ProxyStoreDispatch;
  history: RouteComponentProps['history'];
  network: Network;
  explorerURL: string;
  webExplorerURL: string;
}

const webExplorers = ['https://blockstream.info/liquid', 'https://mempool.space/liquid'];

const SettingsExplorerForm = (props: FormikProps<SettingsExplorerFormValues>) => {
  const { handleSubmit, isSubmitting, setFieldValue, submitForm, errors, values } = props;

  const handleUseDefault = async () => {
    let defaultValue = 'https://blockstream.info/liquid/api';
    if (values.network === 'regtest') {
      defaultValue = 'http://localhost:3001';
    }
    setFieldValue('explorerURL', defaultValue);
    setFieldValue('webExplorerURL', webExplorers[0]);

    // Hack to wait for new value to be applied - https://github.com/formium/formik/issues/529
    await Promise.resolve();
    submitForm().catch(console.error);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-sm mt-3 mb-1 text-base text-left">Web explorer for links</p>
      <Select
        list={webExplorers}
        selected={values.webExplorerURL}
        onSelect={(newValue: string) => setFieldValue('webExplorerURL', newValue)}
        disabled={false}
      />

      <p className="font-sm mt-8 mb-1 text-base text-left">Esplora URL</p>
      <Input name="explorerURL" placeholder="Esplora endpoint URL" type="text" {...props} />

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
          <Button disabled={!!errors.explorerURL || isSubmitting} type="submit">
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
    explorerURL: props.explorerURL,
    webExplorerURL: props.webExplorerURL,
  }),

  validationSchema: Yup.object().shape({
    explorerURL: Yup.string().required('An explorer URL is required'),
  }),

  handleSubmit: async (values, { props }) => {
    await props.dispatch(setWebExplorer(values.webExplorerURL));
    await props.dispatch(setExplorer(values.explorerURL, props.network));
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
        webExplorerURL={app.webExplorer}
      />
    </ShellPopUp>
  );
};

export default SettingsExplorer;
