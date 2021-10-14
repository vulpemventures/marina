import { Field, Form, FormikProps, withFormik } from 'formik';
import React from 'react';
import Shell from '../components/shell';
import * as Yup from 'yup';
import Button from '../components/button';

interface OptInFormProps {
  onSubmit: (values: OptInFormValues) => Promise<void>;
}

interface OptInFormValues {
  cosignerURL: string;
}

const optInForm = (props: FormikProps<OptInFormValues>) => {
  const { touched, errors, isSubmitting } = props;
  return (
    <Form>
      <Field type="url" name="cosignerURL" placeholder="cosigner" classnames="border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 rounded-md"/>
      {touched.cosignerURL && errors.cosignerURL && <div>{errors.cosignerURL}</div>}
      
      <Button className="w-1/5 text-base" disabled={isSubmitting} type="submit">
        Pair with cosigner
      </Button>
    </Form>
  )
}

const OptInFormikForm = withFormik<OptInFormProps, OptInFormValues>({
  validationSchema: Yup.object().shape({
    cosignerURL: Yup.string()
      .required('Please input cosignerURL')
      .url('Not a valid URL')
  }),

  handleSubmit: async (values, { props }) => {
    await props.onSubmit(values);
  },

  displayName: 'OptInForm',
})(optInForm);

const PairCosigner: React.FC = () => {
  const onSubmit = (values: OptInFormValues) => {
    console.log(values);
    return Promise.resolve();
  }
  
  return <Shell>
    <h2 className="mb-4 text-3xl font-medium">{'Restore a wallet from a mnemonic phrase'}</h2>
    <p>{'Pair a new cosigner, endpoints must be compatible with marina cosigner API.'}</p>
    <OptInFormikForm onSubmit={onSubmit}/>
  </Shell>
}

export default PairCosigner;
