import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import { checkRestorationDictionary } from '../../application/account';
import Button from './button';
import Input from './input';
import * as Yup from 'yup';
import type { RestorationJSONDictionary } from '../../domain/backup';

interface FormProps {
  onSubmit: (dict: RestorationJSONDictionary, password: string) => Promise<void>;
}

interface FormValues {
  ionioRestorationDictionaryJSON: string;
  password: string;
}

const Form = (props: FormikProps<FormValues>) => {
  return (
    <form onSubmit={props.handleSubmit} className="mt-8">
      <Input
        {...props}
        name="password"
        placeholder="*******"
        type="password"
        value={props.values.password}
        title="Password"
      />
      <Input
        {...props}
        name="ionioRestorationDictionaryJSON"
        placeholder="paste your JSON here"
        type="textarea"
        value={props.values.ionioRestorationDictionaryJSON}
        title="Restoration JSON"
      />
      <div className="text-right">
        <Button
          className="w-2/5 -mt-2 text-base"
          disabled={
            props.isSubmitting ||
            !!(
              (props.errors.password && props.touched.password) ||
              (props.errors.ionioRestorationDictionaryJSON &&
                props.touched.ionioRestorationDictionaryJSON)
            )
          }
          type="submit"
        >
          Restore
        </Button>
      </div>
    </form>
  );
};

const IonioRestorationForm = withFormik<FormProps, FormValues>({
  mapPropsToValues: (_: any): FormValues => ({
    ionioRestorationDictionaryJSON: '',
    password: '',
  }),
  validationSchema: (_: any): any =>
    Yup.object().shape({
      password: Yup.string().required('Password is required'),
      ionioRestorationDictionaryJSON: Yup.string()
        .required('Restoration JSON required')
        .test('valid-json', 'JSON is not valid', (value) => {
          try {
            if (!value) return false;
            JSON.parse(value);
            return true;
          } catch (e) {
            return false;
          }
        })
        .test('check-restoration-json', 'not a valid Ionio restoration JSON', (value) => {
          return !!value && checkRestorationDictionary(JSON.parse(value));
        }),
    }),
  handleSubmit: async ({ ionioRestorationDictionaryJSON, password }, { props }) => {
    await props.onSubmit(JSON.parse(ionioRestorationDictionaryJSON), password);
  },
})(Form);

export default IonioRestorationForm;
