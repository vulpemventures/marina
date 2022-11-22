import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import { setExplorer } from '../../application/redux/actions/app';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import Button from './button';
import Input from './input';
import * as Yup from 'yup';
import type { NetworkString } from 'ldk';
import type { ExplorerURLs } from '../../domain/app';
import ButtonsAtBottom from './buttons-at-bottom';

type SettingsExplorerFormValues = ExplorerURLs & {
  network: NetworkString;
};

interface SettingsExplorerFormProps {
  dispatch: ProxyStoreDispatch;
  network: NetworkString;
  onDone: () => void;
}

const SettingsExplorerForm = (props: FormikProps<SettingsExplorerFormValues>) => {
  const { handleSubmit, isSubmitting, errors } = props;

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-sm mt-2 mb-1">Custom explorer</p>

      <p className="font-sm text-left">Explorer API URL</p>
      <Input name="explorerURL" placeholder="electrs-like api endpoint" type="text" {...props} />

      <p className="font-sm text-left">Web explorer</p>
      <Input
        name="webExplorerURL"
        placeholder="a valid web version of explorer"
        type="text"
        {...props}
      />

      <p className="font-sm text-left">Web socket endpoint</p>
      <Input
        name="websocketExplorerURL"
        placeholder="a valid web socket endpoint"
        type="text"
        {...props}
      />

      <p className="font-sm text-left">Batch Electrs URL</p>
      <Input name="batchServerURL" placeholder="Electrs batch server" type="text" {...props} />

      <ButtonsAtBottom>
        <Button
          disabled={
            !!errors.explorerURL ||
            !!errors.webExplorerURL ||
            !!errors.websocketExplorerURL ||
            !!errors.batchServerURL ||
            isSubmitting
          }
          type="submit"
        >
          Update
        </Button>
      </ButtonsAtBottom>
    </form>
  );
};

const SettingsCustomExplorerForm = withFormik<
  SettingsExplorerFormProps,
  SettingsExplorerFormValues
>({
  mapPropsToValues: (props): SettingsExplorerFormValues => ({
    type: 'Custom',
    network: props.network,
    explorerURL: '',
    webExplorerURL: '',
    batchServerURL: '',
    websocketExplorerURL: '',
  }),

  validationSchema: Yup.object().shape({
    explorerURL: Yup.string().required('an explorer URL is required'),
    webExplorerURL: Yup.string().required('a web explorer URL is required'),
    websocketExplorerURL: Yup.string().required('a websocket explorer URL is required'),
  }),

  handleSubmit: async (values, { props }) => {
    await props.dispatch(
      setExplorer({ ...values, batchServerURL: values.batchServerURL || undefined }, props.network)
    );

    props.onDone();
  },

  displayName: 'SettingsExplorerCustomForm',
})(SettingsExplorerForm);

export default SettingsCustomExplorerForm;
