import React from 'react';
import { useHistory } from 'react-router';
import { INITIALIZE_CREATE_PASSWORD_ROUTE, RESTORE_VAULT_ROUTE } from '../../routes/constants';
import Button from '../../components/button';

const SelectAction: React.FC = () => {
  const history = useHistory();
  const handleClickRestore = () => history.push(RESTORE_VAULT_ROUTE);
  const handleClickCreate = () => history.push(INITIALIZE_CREATE_PASSWORD_ROUTE);

  return (
    <div className="bg-primary h-screen">
      <div
        className="justify-items-center h-5/6 grid w-screen bg-bottom bg-no-repeat bg-cover"
        style={{
          backgroundImage: "url('/assets/images/fullscreen/bg-wave-top.svg')",
        }}
      >
        <h1 className="self-center text-4xl font-medium">{'What do you want to do?'}</h1>
        <div className="grid grid-flow-row grid-cols-2 gap-20">
          <div className="rounded-3xl flex flex-col justify-around object-contain w-64 h-64 pt-10 pb-6 pl-6 pr-6 text-center bg-white">
            <h2 className="text-xl font-normal">{'Restore a wallet'}</h2>
            <img
              className="w-16 h-16 m-auto"
              src="/assets/images/save.png"
              alt="save"
            ></img>
            <Button className="text-md w-40 mx-auto" onClick={handleClickRestore}>
              {'Restore'}
            </Button>
          </div>
          <div
            className={
              'w-64 h-64 object-contain bg-white rounded-3xl text-center pl-6 pr-6 pb-6 pt-10 justify-around flex flex-col'
            }
          >
            <h2 className="text-xl font-normal">{'Create a new wallet'}</h2>
            <img
              className="w-16 h-16 m-auto"
              src="/assets/images/plus.png"
              alt="plus"
            ></img>
            <Button className="text-md w-40 mx-auto" onClick={handleClickCreate}>
              {'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectAction;
