import { FormikProps, withFormik } from 'formik';
import React from 'react';
import { setExplorer } from '../../application/redux/actions/app';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import Button from './button';
import Input from './input';
import * as Yup from 'yup';
import { NetworkString } from 'ldk';

interface SettingsExplorerFormValues {
  esploraURL: string;
  electrsURL: string;
  network: NetworkString;
}

interface SettingsExplorerFormProps {
  dispatch: ProxyStoreDispatch;
  network: NetworkString;
  onDone: () => void;
}

const SettingsExplorerForm = (props: FormikProps<SettingsExplorerFormValues>) => {
  const { handleSubmit, isSubmitting, errors } = props;

  return (
    <form onSubmit={handleSubmit}>
      <p className="font-sm mt-8 mb-1">Custom explorer</p>

      <p className="font-sm mt-5 mb-1 text-left">Esplora URL</p>
      <Input name="esploraURL" placeholder="Esplora valid endpoint" type="text" {...props} />

      <p className="font-sm mt-5 mb-1 text-left">Electrs URL</p>
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

const SettingsCustomExplorerForm = withFormik<
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

    props.onDone();
  },

  displayName: 'SettingsExplorerForm',
})(SettingsExplorerForm);

export default SettingsCustomExplorerForm;
