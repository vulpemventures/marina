import React from 'react';
import Button from '../../components/button';
import { useHistory } from 'react-router-dom';
import { INITIALIZE_SELECT_ACTION_ROUTE } from '../../routes/constants';
import { useSelector } from 'react-redux';
import { hasMnemonicSelector } from '../../../application/redux/selectors/wallet.selector';

const Welcome: React.FC = () => {
  const history = useHistory();
  const handleClick = () => history.push(INITIALIZE_SELECT_ACTION_ROUTE);
  const hasMnemonic = useSelector(hasMnemonicSelector);

  return (
    <div
      className="justify-items-center bg-primary grid h-screen grid-flow-col grid-rows-2 gap-10 bg-bottom bg-no-repeat bg-contain"
      style={{
        backgroundImage:
          "url('/assets/images/fullscreen/bg-wave-bottom.svg'), url('/assets/images/fullscreen/bg-wave-middle.svg')"
      }}
    >
      <div className="self-center">
        <img className="w-28 m-auto" src="assets/images/marina-logo.svg" alt="marina logo" />
        <h2 className="my-5 text-4xl text-white">Welcome to Marina</h2>
      </div>

      <div className="flex flex-col self-center justify-center align-middle">
        {hasMnemonic && (
          <div className="bg-red bg-opacity-80 text-md text flex justify-between p-4 text-white align-middle border-0.5 rounded shadow-lg">
            <div>
              <img className="w-12" src="/assets/images/warning.svg" />
            </div>
            <div className="self-center ml-2">
              <span>There is a mnemonic registered on this browser. </span>
              <br />
              <span>Restoring a new wallet will delete that one. </span>
              <br />
              <span>Make sure you have a way to restore it so you don't lose it defenitly.</span>
            </div>
          </div>
        )}
        <div className="self-center">
          <Button className="w-52 justify-center mt-3 text-lg" onClick={handleClick}>
            {hasMnemonic ? 'Restore Wallet' : 'Get Started'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
