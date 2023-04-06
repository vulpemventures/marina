import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ModalMenu from './modal-menu';
import { DEFAULT_ROUTE } from '../routes/constants';
import { useStorageContext } from '../context/storage-context';
import { formatNetwork } from '../utility';
import { UpdaterService } from '../../application/updater';
import zkp from '@vulpemventures/secp256k1-zkp';
import classNames from 'classnames';

interface Props {
  btnDisabled?: boolean;
  backBtnCb?: () => void;
  backgroundImagePath?: string;
  children: React.ReactNode;
  className?: string;
  currentPage?: string;
  hasBackBtn?: boolean;
  refreshCb?: (balances: { [p: string]: number }) => void;
}

const ShellPopUp: React.FC<Props> = ({
  backBtnCb,
  backgroundImagePath,
  children,
  className = '',
  currentPage,
  hasBackBtn = true,
  btnDisabled = false,
}) => {
  const history = useHistory();
  const {
    walletRepository,
    assetRepository,
    blockHeadersRepository,
    appRepository,
    sendFlowRepository,
    cache,
  } = useStorageContext();
  const [isRestorerLoading, setIsRestorerLoading] = useState(false);
  const [isUpdaterLoading, setIsUpdaterLoading] = useState(false);

  useEffect(() => {
    const closeFnUpdaterLoader = appRepository.updaterLoader.onChanged((isUpdaterLoading) => {
      setIsUpdaterLoading(isUpdaterLoading);
    });
    const closeFnRestorerLoader = appRepository.restorerLoader.onChanged((isRestorerLoading) => {
      setIsRestorerLoading(isRestorerLoading);
    });
    return () => {
      closeFnUpdaterLoader();
      closeFnRestorerLoader();
    };
  });

  // Menu modal
  const [isMenuModalOpen, showMenuModal] = useState(false);
  const openMenuModal = () => showMenuModal(true);
  const closeMenuModal = () => showMenuModal(false);

  const [updating, setUpdating] = useState(false);

  const goToHome = async () => {
    if (history.location.pathname !== DEFAULT_ROUTE) {
      await sendFlowRepository.reset();
      history.push(DEFAULT_ROUTE);
    } else {
      if (updating) return;
      setUpdating(true);
      try {
        const updater = new UpdaterService(
          walletRepository,
          appRepository,
          blockHeadersRepository,
          assetRepository,
          await zkp()
        );
        if (!cache?.network) throw new Error('Network not found');
        await updater.checkAndFixMissingTransactionsData(cache.network);
      } catch (e) {
        console.error(e);
      } finally {
        setUpdating(false);
      }
    }
  };
  const handleBackBtn = () => {
    if (backBtnCb) {
      backBtnCb();
    } else {
      history.goBack();
    }
  };

  function getLoaderText(): string | undefined {
    if (isRestorerLoading) return 'Restoring...';
    if (isUpdaterLoading) return 'Updating...';
    return undefined;
  }

  function loader(): JSX.Element {
    return <span className="animate-pulse">{getLoaderText()}</span>;
  }

  let nav;
  if (hasBackBtn && !currentPage) {
    nav = (
      <button
        disabled={btnDisabled}
        className="focus:outline-none flex items-center justify-center w-full h-8"
        onClick={handleBackBtn}
      >
        <img
          className="top-13 absolute left-0 w-5 ml-4"
          src="assets/images/chevron-left.svg"
          alt="chevron-left"
        />
      </button>
    );
  } else if (hasBackBtn && currentPage) {
    nav = (
      <span className="flex items-center justify-center w-full h-8">
        <button disabled={btnDisabled} className="focus:outline-none" onClick={handleBackBtn}>
          <img
            className="top-13 absolute left-0 z-10 w-5 ml-4"
            src="assets/images/chevron-left.svg"
            alt="chevron-left"
          />
        </button>
        <span>{currentPage}</span>
      </span>
    );
  } else if (!hasBackBtn && currentPage) {
    nav = <span className="flex items-center justify-center w-full h-8">{currentPage}</span>;
  } else {
    nav = <div className="h-8" />;
  }

  return (
    <div id="shell-popup" className="grid h-screen">
      <header>
        <div className="bg-grayNavBar border-graySuperLight flex flex-row items-center content-center justify-between h-12 border-b-2">
          <div className="flex flex-row items-center">
            <button onClick={goToHome}>
              <img
                className={classNames('px-4', { 'animate-spin': updating })}
                src="assets/images/marina-logo.svg"
                alt="marina logo"
              />
            </button>

            {cache?.network !== 'liquid' && (
              <div>
                {cache?.network && (
                  <span className="bg-red inline-flex items-center justify-center px-2 py-1 text-xs font-semibold leading-none text-white rounded-full">
                    {cache && formatNetwork(cache.network)}
                  </span>
                )}
              </div>
            )}
          </div>
          {(isUpdaterLoading || isRestorerLoading) && loader()}
          <button disabled={btnDisabled} onClick={openMenuModal}>
            <img className="px-4" src="assets/images/popup/dots-vertical.svg" alt="menu icon" />
          </button>
        </div>
        {nav}
      </header>

      {backgroundImagePath ? (
        <main
          className={className}
          style={{
            backgroundImage: `url(${backgroundImagePath})`,
          }}
        >
          {children}
        </main>
      ) : (
        <main className={className}>{children}</main>
      )}

      <ModalMenu isOpen={isMenuModalOpen} handleClose={closeMenuModal} />
    </div>
  );
};

export default ShellPopUp;
