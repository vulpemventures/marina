import React, { useEffect } from 'react';
import PopupBroker from '../popups/popupBroker';

interface Props {
  children: React.ReactNode;
  className?: string;
  currentPage?: string;
}

const ShellConnectPopup: React.FC<Props> = ({ children, className = '', currentPage }: Props) => {
  PopupBroker.Start();

  // Prevent resize
  useEffect(() => {
    function handleResize() {
      window.resizeTo(360, 600);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div id="shell-popup" className="grid h-screen">
      <header>
        <div className="bg-grayNavBar border-graySuperLight flex flex-row items-center justify-between h-12 border-b-2">
          <img className="px-4" src="assets/images/marina-logo.svg" alt="marina logo" />
        </div>
        <span className="flex items-center justify-center w-full h-8">{currentPage}</span>
      </header>

      <main
        className={className}
        style={{ backgroundImage: `url(/assets/images/popup/bg-sm.png)` }}
      >
        {children}
      </main>
    </div>
  );
};

export default ShellConnectPopup;
