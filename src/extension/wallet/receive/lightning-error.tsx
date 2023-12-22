import React from 'react';
import { useHistory, useLocation } from 'react-router';
import ShellPopUp from '../../components/shell-popup';
import { SOMETHING_WENT_WRONG_ERROR } from '../../../domain/constants';
import { DEFAULT_ROUTE, LIGHTNING_ENTER_AMOUNT_ROUTE } from '../../routes/constants';

interface LocationState {
  error: string;
  tx: string;
}

const LightningError: React.FC = () => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();

  const handleBackBtn = () => {
    history.push({
      pathname: LIGHTNING_ENTER_AMOUNT_ROUTE,
    });
  };

  const handleBackToHome = () => history.push(DEFAULT_ROUTE);

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Error"
    >
      <h1 className="mt-8 text-lg font-medium">{SOMETHING_WENT_WRONG_ERROR}</h1>
      <p className="font-small mt-4 text-sm break-all">{state?.error}</p>
      <img className="my-14 mx-auto" src="/assets/images/cross.svg" alt="error" />
      <button className="container flex flex-row-reverse mt-24" onClick={handleBackToHome}>
        <span className="text-primary text-sm font-bold">Go to Home</span>
        <img className="mr-2" src="/assets/images/arrow-narrow-right.svg" alt="navigate home" />
      </button>
    </ShellPopUp>
  );
};

export default LightningError;
