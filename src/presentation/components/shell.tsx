import React from 'react';
import { useHistory } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  className?: string;
  hasBackBtn?: boolean;
}

const Shell: React.FC<Props> = ({ children, className, hasBackBtn = true }: Props) => {
  const history = useHistory();
  const goToPreviousPath = () => history.goBack();
  return (
    <>
      <div
        className="h-screen bg-bottom bg-no-repeat bg-contain"
        style={{
          backgroundImage: "url('/assets/images/onboarding/bg-wave-bottom.svg')",
        }}
      >
        {hasBackBtn ? (
          <button
            className="md:ml-24 lg:ml-40 flex items-center h-32 ml-10"
            onClick={goToPreviousPath}
          >
            <img src="/assets/images/chevron-left.png" alt="chevron-left" />
            {'Back'}
          </button>
        ) : (
          <div className="h-32"></div>
        )}
        <div className={`container mx-auto ${className}`}>{children}</div>
      </div>
    </>
  );
};

export default Shell;
