import React from 'react';
import { useLocation } from 'react-router';
import Shell from '../components/shell';
import ShellPopUp from '../components/shell-popup';
import TermsOfService from '../components/terms-of-service';

interface LocationState {
  isFullScreen: boolean;
}

const SettingsTerms: React.FC = () => {
  const { state } = useLocation<LocationState>();

  if (state && state.isFullScreen)
    return (
      <Shell className="space-y-10">
        <h1 className="mb-5 text-3xl font-medium">Terms of Service</h1>
        <TermsOfService />;
      </Shell>
    );

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Terms of Service"
    >
      <TermsOfService />
    </ShellPopUp>
  );
};

export default SettingsTerms;
