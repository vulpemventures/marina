import { useEffect, useState } from 'react';
import type { Toast } from '../context/toast-context';
import { useToastContext } from '../context/toast-context';
import classNames from 'classnames';

const ToastView: React.FC<Toast> = ({ id, message, duration }) => {
  const { deleteToast } = useToastContext();
  const [show, setShow] = useState(false);
  const [disapear, setDisapear] = useState(false);

  const deleteToastWithAnimation = (id: number) => {
    setDisapear(true);
    setShow(false);
    setTimeout(() => {
      deleteToast(id);
    }, 110); // delay must be greater than the transition duration
  };

  useEffect(() => {
    const timeoutShow = setTimeout(() => {
      setShow(true);
    }, 100);

    const timeout = setTimeout(() => {
      deleteToastWithAnimation(id);
    }, duration);

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeoutShow);
    };
  }, []);

  return (
    <div
      className={classNames(
        'bg-red absolute z-50 flex items-center w-full max-w-xs p-4 m-5 text-gray-500 rounded-lg shadow',
        { invisible: !show && !disapear },
        { 'transition duration-300 ease-out transform translate-y-4': show && !disapear },
        { 'transition duration-100 ease-in transform -translate-y-4': disapear }
      )}
      role="alert"
    >
      <div className="m-1 text-sm font-normal text-white">{message}</div>
      <div className="flex items-center ml-auto">
        <button
          onClick={() => deleteToastWithAnimation(id)}
          type="button"
          className="bg-red text-white hover:text-gray rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
          data-dismiss-target="#toast-undo"
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <svg
            aria-hidden="true"
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

const Toasts: React.FC = () => {
  const { toasts } = useToastContext();

  return (
    <div className="top-5 left-15 absolute w-full">
      {toasts.map((toast) => (
        <ToastView key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toasts;
