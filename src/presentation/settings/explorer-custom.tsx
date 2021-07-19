import { FormikProps, withFormik } from 'formik';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps, useHistory } from 'react-router';
import { setExplorer } from '../../application/redux/actions/app';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { RootReducerState } from '../../domain/common';
import { Network } from '../../domain/network';
import Button from '../components/button';
import Input from '../components/input';
import ShellPopUp from '../components/shell-popup';
import * as Yup from 'yup';

interface SettingsExplorerFormValues {
  esploraURL: string;
  electrsURL: string;
  network: Network;
}

interface SettingsExplorerFormProps {
  dispatch: ProxyStoreDispatch;
  history: RouteComponentProps['history'];
  network: Network;
}

const SettingsExplorerForm = (props: FormikProps<SettingsExplorerFormValues>) => {
  const { handleSubmit, isSubmitting, errors } = props;

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-sm mt-3 mb-1 text-base text-left">Custom explorer</p>

      <p className="font-sm mt-8 mb-1 text-base text-left">Esplora URL</p>
      <Input name="esploraURL" placeholder="Esplora valid endpoint" type="text" {...props} />

      <p className="font-sm mt-8 mb-1 text-base text-left">Electrs URL</p>
      <Input name="electrsURL" placeholder="Electrs valid endpoint" type="text" {...props} />

      <div className="bottom-20 right-8 absolute flex justify-end">
        <div>
          <Button disabled={!!errors.esploraURL || isSubmitting} type="submit">
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
    esploraURL: '',
    electrsURL: '',
  }),

  validationSchema: Yup.object().shape({
    esploraURL: Yup.string().required('An explorer URL is required'),
    electrsURL: Yup.string().required('A web explorer URL is required'),
  }),

  handleSubmit: async (values, { props }) => {
    await props.dispatch(
      setExplorer(
        { type: 'Custom', esploraURL: values.esploraURL, electrsURL: values.electrsURL },
        props.network
      )
    );

    props.history.goBack();
  },

  displayName: 'SettingsExplorerForm',
})(SettingsExplorerForm);

const SettingsCustomExplorer: React.FC = () => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const app = useSelector((state: RootReducerState) => state.app);
  const network = app.network;

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Explorer"
    >
      <SettingsExplorerEnhancedForm dispatch={dispatch} history={history} network={network} />
    </ShellPopUp>
  );
};

export default SettingsCustomExplorer;
