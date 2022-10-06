import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import ModalMenu from './modal-menu';
import { DEFAULT_ROUTE } from '../routes/constants';
import { useDispatch, useSelector } from 'react-redux';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { flushPendingTx } from '../../application/redux/actions/transaction';
import {
  selectAllAccountsIDs,
  selectDeepRestorerIsLoading,
  selectUpdaterIsLoading,
} from '../../application/redux/selectors/wallet.selector';
import { updateTaskAction } from '../../application/redux/actions/task';
import { formatNetwork } from '../utils';
import { selectNetwork } from '../../application/redux/selectors/app.selector';
import type { AccountID } from '../../domain/account';

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
}: Props) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const allAccountsIds = useSelector(selectAllAccountsIDs);
  const updaterIsLoading = useSelector(selectUpdaterIsLoading);
  const deepRestorerLoading = useSelector(selectDeepRestorerIsLoading);
  const network = useSelector(selectNetwork);
  // Menu modal
  const [isMenuModalOpen, showMenuModal] = useState(false);
  const openMenuModal = () => showMenuModal(true);
  const closeMenuModal = () => showMenuModal(false);
  //
  const goToHome = async () => {
    // If already home, refresh state and return balances
    if (history.location.pathname === '/') {
      const makeUpdateTaskForId = (id: AccountID) => updateTaskAction(id, network);
      await Promise.all(allAccountsIds.map(makeUpdateTaskForId).map(dispatch));
    } else {
      await dispatch(flushPendingTx());
      history.push(DEFAULT_ROUTE);
    }
  };
  const handleBackBtn = () => {
    if (backBtnCb) {
      backBtnCb();
    } else {
      history.goBack();
    }
  };

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
            className="top-13 absolute left-0 w-5 ml-4"
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
              <img className="px-4" src="assets/images/marina-logo.svg" alt="marina logo" />
            </button>

            {network !== 'liquid' && (
              <div>
                <span className="bg-red inline-flex items-center justify-center px-2 py-1 text-xs font-semibold leading-none text-white rounded-full">
                  {formatNetwork(network)}
                </span>
              </div>
            )}
          </div>
          {(deepRestorerLoading || updaterIsLoading) && loader()}
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

  function getLoaderText(): string | undefined {
    if (deepRestorerLoading) return 'Restoring...';
    if (updaterIsLoading) return 'Updating...';
    return undefined;
  }

  function loader(): JSX.Element {
    return <span className="animate-pulse">{getLoaderText()}</span>;
  }
};

export default ShellPopUp;
