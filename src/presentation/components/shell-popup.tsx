import React from 'react';
import { useHistory } from 'react-router-dom';
import { DEFAULT_ROUTE } from '../routes/constants';

interface Props {
  backBtnCb?: () => void;
  backgroundImagePath: string;
  children: React.ReactNode;
  className?: string;
  currentPage?: string;
  hasBackBtn?: boolean;
}

const ShellPopUp: React.FC<Props> = ({
  backBtnCb,
  backgroundImagePath,
  children,
  className = '',
  currentPage,
  hasBackBtn = true,
}: Props) => {
  const history = useHistory();
  const goToPreviousPath = () => history.goBack();
  const goToHome = () => history.push(DEFAULT_ROUTE);
  const handleBackBtn = () => {
    if (backBtnCb) {
      backBtnCb();
    } else {
      goToPreviousPath();
    }
  };

  return (
    <div id="shell-popup" className="grid h-screen">
      <header>
        <div className="bg-grayNavBar border-graySuperLight flex flex-row items-center justify-between h-12 border-b-2">
          <button onClick={goToHome}>
            <img className="px-4" src="assets/images/marina-logo.svg" alt="marina logo" />
          </button>
          <button onClick={() => console.log('clicked!')}>
            <img className="px-4" src="assets/images/popup/dots-vertical.svg" alt="menu icon" />
          </button>
        </div>
        {hasBackBtn ? (
          <button className="flex items-center justify-center w-full h-8" onClick={handleBackBtn}>
            <img
              className="absolute left-0 mx-4"
              src="assets/images/chevron-left.svg"
              alt="chevron-left"
            />
            <span>{currentPage}</span>
          </button>
        ) : (
          <div className="h-8"></div>
        )}
      </header>

      <main
        className={className}
        style={{
          backgroundImage: `url(${backgroundImagePath})`,
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default ShellPopUp;
