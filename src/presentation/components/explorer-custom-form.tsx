import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import React from 'react';
import { setExplorer } from '../../application/redux/actions/app';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import Button from './button';
import Input from './input';
import * as Yup from 'yup';
import type { NetworkString } from 'ldk';
import type { ExplorerURLs } from '../../domain/app';

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

      <p className="font-sm text-left">Esplora URL</p>
      <Input name="esploraURL" placeholder="Esplora valid endpoint" type="text" {...props} />

      <p className="font-sm text-left">Electrs URL</p>
      <Input name="electrsURL" placeholder="Electrs valid endpoint" type="text" {...props} />

      <p className="font-sm text-left">Batch Electrs URL</p>
      <Input name="batchServerURL" placeholder="Electrs batch server" type="text" {...props} />

      <div className="bottom-15 right-8 absolute flex justify-end">
        <div>
          <Button
            disabled={
              !!errors.esploraURL || !!errors.electrsURL || !!errors.batchServerURL || isSubmitting
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

const SettingsCustomExplorerForm = withFormik<
  SettingsExplorerFormProps,
  SettingsExplorerFormValues
>({
  mapPropsToValues: (props): SettingsExplorerFormValues => ({
    type: 'Custom',
    network: props.network,
    esploraURL: '',
    electrsURL: '',
    batchServerURL: '',
  }),

  validationSchema: Yup.object().shape({
    esploraURL: Yup.string().required('An explorer URL is required'),
    electrsURL: Yup.string().required('A web explorer URL is required'),
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
