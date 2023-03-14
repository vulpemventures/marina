import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import type { NetworkString } from 'marina-provider';
import { useHistory } from 'react-router';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import Input from '../components/input';
import ShellPopUp from '../components/shell-popup';
import * as Yup from 'yup';
import { BlockstreamExplorerURLs } from '../../domain/explorer';
import { useStorageContext } from '../context/storage-context';

type SettingsExplorerFormValues = {
  websocketExplorerURL: string;
  webExplorerURL: string;
};

interface SettingsExplorerFormProps {
  network: NetworkString;
  onDone: (values: SettingsExplorerFormValues) => Promise<void>;
}

const SettingsExplorerForm = (props: FormikProps<SettingsExplorerFormValues>) => {
  const { handleSubmit, isSubmitting, errors } = props;

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-sm mt-2 mb-1">Custom explorer</p>

      <p className="font-sm text-left">Web explorer</p>
      <Input
        name="webExplorerURL"
        placeholder={BlockstreamExplorerURLs.webExplorerURL}
        type="text"
        {...props}
      />

      <p className="font-sm text-left">Web socket endpoint</p>
      <Input
        name="websocketExplorerURL"
        placeholder={BlockstreamExplorerURLs.websocketExplorerURL}
        type="text"
        {...props}
      />

      <ButtonsAtBottom>
        <Button
          disabled={!!errors.webExplorerURL || !!errors.websocketExplorerURL || isSubmitting}
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
  mapPropsToValues: (): SettingsExplorerFormValues => ({
    webExplorerURL: '',
    websocketExplorerURL: '',
  }),

  validationSchema: Yup.object().shape({
    webExplorerURL: Yup.string().required('Web explorer URL required'),
    websocketExplorerURL: Yup.string().required('Websocket URL required'),
  }),

  handleSubmit: async (values, { props }) => {
    await props.onDone(values);
  },

  displayName: 'SettingsExplorerCustomForm',
})(SettingsExplorerForm);

const SettingsExplorerCustom: React.FC = () => {
  const { appRepository, cache } = useStorageContext();
  const history = useHistory();

  const onDone = async (values: SettingsExplorerFormValues) => {
    if (!cache?.network) {
      return Promise.resolve();
    }
    await appRepository.setWebsocketExplorerURLs({
      [cache.network]: values.websocketExplorerURL,
    });
    await appRepository.setWebExplorerURL(cache.network, values.webExplorerURL);
    return Promise.resolve(history.goBack());
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Explorer"
    >
      {cache?.network && <SettingsCustomExplorerForm onDone={onDone} network={cache.network} />}
    </ShellPopUp>
  );
};

export default SettingsExplorerCustom;
