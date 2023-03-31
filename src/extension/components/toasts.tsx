import { useEffect } from 'react';
import type { Toast } from '../context/toast-context';
import { useToastContext } from '../context/toast-context';

const ToastView: React.FC<Toast> = ({ id, message, duration }) => {
  const { deleteToast } = useToastContext();

  useEffect(() => {
    const timeout = setTimeout(() => {
      deleteToast(id);
    }, duration);

    return () => clearTimeout(timeout);
  });

  return (
    <div
      className="bg-red z-50 flex items-center w-full max-w-xs p-4 m-5 text-gray-500 rounded-lg shadow"
      role="alert"
    >
      <div className="m-1 text-sm font-normal text-white">{message}</div>
      <div className="flex items-center ml-auto">
        <button
          onClick={() => deleteToast(id)}
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
    <div className="top-5 left-15 fixed w-full">
      {toasts.map((toast) => (
        <ToastView key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toasts;
