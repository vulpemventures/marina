import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import ModalMenu from './modal-menu';
import { DEFAULT_ROUTE } from '../routes/constants';
import { useDispatch, useSelector } from 'react-redux';
import { ProxyStoreDispatch } from '..';
import { RootState } from '../../application/redux/store';
import { flushTx } from '../../application/redux/actions/transaction';

interface Props {
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
  refreshCb,
}: Props) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const wallet = useSelector((state: RootState) => state.wallets[0]);

  // Menu modal
  const [isMenuModalOpen, showMenuModal] = useState(false);
  const openMenuModal = () => showMenuModal(true);
  const closeMenuModal = () => showMenuModal(false);
  //
  const goToHome = () => {
    // If already home, refresh state and return balances
    if (history.location.pathname === '/') {
      // dispatch(updateUtxosAssetsBalances(true, refreshCb, (error) => console.log(error)));
    }
    if (wallet.pendingTx) {
      dispatch(flushTx(() => history.push(DEFAULT_ROUTE)));
    } else {
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
        <button className="focus:outline-none" onClick={handleBackBtn}>
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
        <div className="bg-grayNavBar border-graySuperLight flex flex-row items-center justify-between h-12 border-b-2">
          <button onClick={goToHome}>
            <img className="px-4" src="assets/images/marina-logo.svg" alt="marina logo" />
          </button>
          <button onClick={openMenuModal}>
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
