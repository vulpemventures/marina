import * as Yup from 'yup';
import type { FormikProps } from 'formik';
import { withFormik } from 'formik';
import Input from './input';
import Button from './button';

interface FormProps {
  onSubmit: (githubToken: string) => void;
}

interface FormValues {
  githubToken: string;
}

const Form = (props: FormikProps<FormValues>) => {
  return (
    <form onSubmit={props.handleSubmit} className="w-full mt-8">
      <Input
        {...props}
        name="githubToken"
        placeholder="paste your GitHub token here"
        type="textarea"
        value={props.values.githubToken}
        title="GitHub Token"
      />
      <div className="text-right">
        <Button
          className="-mt-2 text-base"
          disabled={props.isSubmitting || !!(props.errors.githubToken && props.touched.githubToken)}
          type="submit"
        >
          OK
        </Button>
      </div>
    </form>
  );
};

const GithubBackupForm = withFormik<FormProps, FormValues>({
  mapPropsToValues: () => ({
    githubToken: '',
  }),
  validationSchema: Yup.object().shape({
    githubToken: Yup.string().required('Required'),
  }),
  handleSubmit: (values, { props }) => {
    props.onSubmit(values.githubToken);
  },
})(Form);

export default GithubBackupForm;
