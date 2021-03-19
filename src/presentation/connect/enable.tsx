import React from 'react';
import Button from '../components/button';
import ShellPopUp from '../components/shell-popup';

const ConnectEnable: React.FC = () => {
  const permissions = ['View this address of your account'];
  const websiteTitle = 'Sideshift.ai';
  const handleReject = () => console.log('reject');
  const handleAccept = () => console.log('accept');

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      <h1 className="mt-8 text-2xl font-medium">{websiteTitle}</h1>

      <p className="mt-4 text-base font-medium">Connect with Marina</p>

      <p className="mt-12 text-base font-medium">Give permission to this site to:</p>

      {permissions.map((p, i) => (
        <div className="container flex mt-10 text-left" key={i}>
          <img className="mr-4" src="/assets/images/checkbox-checked.svg" alt="checkbox" />
          <span className="font-regular text-base">{p}</span>
        </div>
      ))}

      <div className="bottom-24 container absolute right-0 flex justify-between">
        <Button isOutline={true} onClick={handleReject} textBase={true}>
          Reject
        </Button>
        <Button onClick={handleAccept} textBase={true}>
          Connect
        </Button>
      </div>
    </ShellPopUp>
  );
};

export default ConnectEnable;
