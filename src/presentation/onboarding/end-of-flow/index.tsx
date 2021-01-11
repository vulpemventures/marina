import React, { useContext } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { AppContext } from '../../../application/background_script';
import Button from '../../components/button';
import Shell from '../../components/shell';
import { createWallet } from '../../../application/store/actions';
import * as ACTIONS from '../../../application/store/actions/action-types';
import { BrowserStorageWalletRepo } from '../../../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { DEFAULT_ROUTE } from '../../routes/constants';

interface LocationState {
  password: string;
  mnemonic: string;
}

const EndOfFlow: React.FC = () => {
  const history = useHistory();
  const { state } = useLocation<LocationState>();
  const [, dispatch] = useContext(AppContext);

  let handleClick = () => {
    dispatch([ACTIONS.ONBOARDING_COMPLETETED]);
    history.push(DEFAULT_ROUTE);
  };
  if (state && state.password && state.mnemonic) {
    const repo = new BrowserStorageWalletRepo();

    const onSuccess = () => {
      dispatch([ACTIONS.ONBOARDING_COMPLETETED]);
      history.push(DEFAULT_ROUTE);
    };
    const onError = (err: Error) => console.log(err);
    handleClick = () =>
      dispatch(createWallet(state.password, state.mnemonic, 'regtest', repo, onSuccess, onError));
  }

  return (
    <Shell hasBackBtn={false}>
      <h1 className="text-5xl">Congratulations !</h1>
      <p className="mt-4">You have just created a new wallet</p>
      <img className="w-72 mb-14 mt-10" src="/assets/images/mermaid.png" alt="mermaid" />
      <Button onClick={handleClick}>Done</Button>
    </Shell>
  );
};

export default EndOfFlow;
