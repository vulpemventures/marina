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
        <h1 className="self-center text-4xl font-medium">What do you want to do?</h1>
        <div className="grid grid-flow-row grid-cols-2 gap-12">
          <div className="rounded-3xl flex flex-col justify-around object-contain w-52 h-52 pt-10 pb-6 pl-6 pr-6 text-center bg-white">
            <h2 className="text-xl font-normal">{'Restore a wallet'}</h2>
            <img className="w-16 h-16 m-auto" src="/assets/images/save.png" alt="save" />
            <Button className="text-md w-40 mx-auto" onClick={handleClickRestore}>
              {'Restore'}
            </Button>
          </div>
          <div className="rounded-3xl flex flex-col justify-around object-contain w-52 h-52 pt-10 pb-6 pl-6 pr-6 text-center bg-white">
            <h2 className="text-xl font-normal">{'New wallet'}</h2>
            <img className="w-16 h-16 m-auto" src="/assets/images/plus.png" alt="plus" />
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
