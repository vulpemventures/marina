import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import type { NetworkString } from 'marina-provider';
import { useHistory } from 'react-router';
import { appRepository, useSelectNetwork } from '../../infrastructure/storage/common';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import Input from '../components/input';
import ShellPopUp from '../components/shell-popup';
import * as Yup from 'yup';

type SettingsExplorerFormValues = {
  websocketExplorerURL: string;
  webExplorerURL: string;
};

interface SettingsExplorerFormProps {
  network: NetworkString;
  onDone: () => void;
}

const SettingsExplorerForm = (props: FormikProps<SettingsExplorerFormValues>) => {
  const { handleSubmit, isSubmitting, errors } = props;

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-sm mt-2 mb-1">Custom explorer</p>

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
  mapPropsToValues: (props): SettingsExplorerFormValues => ({
    webExplorerURL: '',
    websocketExplorerURL: '',
  }),

  validationSchema: Yup.object().shape({
    explorerURL: Yup.string().required('an explorer URL is required'),
    webExplorerURL: Yup.string().required('a web explorer URL is required'),
    websocketExplorerURL: Yup.string().required('a websocket explorer URL is required'),
  }),

  handleSubmit: async (values, { props }) => {
    await appRepository.setWebsocketExplorerURLs({
      [props.network]: values.websocketExplorerURL,
    });

    await appRepository.setWebExplorerURL(props.network, values.webExplorerURL);

    props.onDone();
  },

  displayName: 'SettingsExplorerCustomForm',
})(SettingsExplorerForm);

const SettingsExplorerCustom: React.FC = () => {
  const history = useHistory();
  const network = useSelectNetwork();

  const onDone = () => {
    history.goBack();
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Explorer"
    >
      {network && <SettingsCustomExplorerForm onDone={onDone} network={network} />}
    </ShellPopUp>
  );
};

export default SettingsExplorerCustom;
