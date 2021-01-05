import React from 'react';
import Button from '../../components/button';
import { useHistory } from 'react-router-dom';
import { INITIALIZE_SELECT_ACTION_ROUTE } from '../../routes/constants';

const Welcome: React.FC = () => {
  const history = useHistory();
  const handleClick = () => history.push(INITIALIZE_SELECT_ACTION_ROUTE);

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
      <div className="self-center">
        <Button className="w-52 mt-32 text-lg" onClick={handleClick}>
          {'Get Started'}
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
