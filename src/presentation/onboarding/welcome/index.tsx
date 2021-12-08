import React from 'react';
import Button from '../../components/button';
import { useHistory } from 'react-router-dom';
import { INITIALIZE_SELECT_ACTION_ROUTE } from '../../routes/constants';
import { useSelector } from 'react-redux';
import { hasMnemonicSelector } from '../../../application/redux/selectors/wallet.selector';
import WarningDeleteMnemonic from '../../components/warningDeleteMnemonic';

const Welcome: React.FC = () => {
  const history = useHistory();
  const handleClick = () => history.push(INITIALIZE_SELECT_ACTION_ROUTE);
  const hasMnemonic = useSelector(hasMnemonicSelector);

  return (
    <div
      className="justify-items-center bg-primary grid h-screen grid-flow-col grid-rows-2 gap-10 bg-bottom bg-no-repeat bg-contain"
      style={{
        backgroundImage:
          "url('/assets/images/fullscreen/bg-wave-bottom.svg'), url('/assets/images/fullscreen/bg-wave-middle.svg')",
      }}
    >
      <div className="self-center">
        <img className="w-28 m-auto" src="assets/images/marina-logo.svg" alt="marina logo" />
        <h2 className="my-5 text-4xl text-white">Welcome to Marina</h2>
      </div>

      <div className="flex flex-col self-center justify-center align-middle">
        {hasMnemonic && <WarningDeleteMnemonic />}
        <div className="self-center">
          <Button className="w-80 justify-center mt-3 text-lg" onClick={handleClick}>
            {hasMnemonic ? 'I understand, go ahead!' : 'Get Started'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
