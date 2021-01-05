import React from 'react';
import { FallbackProps } from 'react-error-boundary';

const ErrorFallback: React.FC<FallbackProps> = ({ error }) => {
  return (
    <div role="alert" className="text-red text-sm font-medium text-center">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  );
};

export default ErrorFallback;
