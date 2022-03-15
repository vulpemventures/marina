import cx from 'classnames';
import type { FormikProps } from 'formik';

interface InputProps<FormValues> extends FormikProps<FormValues> {
  name: keyof FormValues;
  placeholder?: string;
  title?: string;
  type: 'text' | 'password';
}

/**
 * Generic Formik Input
 */
export default function Input<FormValues>({
  errors,
  status,
  name,
  placeholder = '',
  title,
  touched,
  type = 'text',
  values,
  handleChange,
  handleBlur,
}: InputProps<FormValues>) {
  return (
    <div
      className={cx({
        'mb-12': !errors[name] || !touched[name],
      })}
    >
      <label className="block text-left">
        {title && <p className="mb-2 font-medium">{title}</p>}
        <input
          className={cx(
            'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-full sm:w-2/5 rounded-md',
            {
              'border-red': errors[name] && touched[name],
              'border-grayLight': !errors[name],
            }
          )}
          id={name.toString()}
          name={name.toString()}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          type={type}
          value={String(values[name])}
        />
      </label>
      {status?.[name] ? (
        <p className="text-red h-10 mt-2 text-xs text-left">{status[name]}</p>
      ) : (
        errors[name] &&
        touched[name] && <p className="text-red h-10 mt-2 text-xs text-left">{errors[name]}</p>
      )}
    </div>
  );
}
