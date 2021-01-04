import React from 'react';
import { useHistory } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  className?: string;
  hasBackBtn?: boolean;
}

const Shell: React.FC<Props> = ({ children, className = '', hasBackBtn = true }: Props) => {
  const history = useHistory();
  const goToPreviousPath = () => history.goBack();

  return (
    // Onboarding screens have to be composed of three rows: header with back button, main, footer image
    <div id="shell" className="grid-rows-pancakeStack grid h-screen">
      <header>
        {hasBackBtn ? (
          <button
            className="md:ml-24 lg:ml-40 flex items-center h-32 ml-10"
            onClick={goToPreviousPath}
          >
            <img src="/assets/images/arrow-back.svg" alt="navigate back" />
            {'Back'}
          </button>
        ) : (
          <div className="h-32"></div>
        )}
      </header>

      <main className={`container mx-auto ${className}`}>{children}</main>

      <footer>
        <img src="/assets/images/fullscreen/bg-onboarding.png" alt="background bottom" />
      </footer>
    </div>
  );
};

export default Shell;
