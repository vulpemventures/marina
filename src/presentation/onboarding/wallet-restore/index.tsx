import React, { useContext, useEffect, useState } from 'react';
//import { useHistory } from 'react-router';
import { AppContext } from '../../../application/background_script';
import Button from '../../components/button';
import Shell from '../../components/shell';
// import { INITIALIZE_END_OF_FLOW_ROUTE } from '../routes/constants';
import * as ACTIONS from '../../../application/store/actions/action-types';
import classnames from 'classnames';

const WalletRestore: React.FC = () => {
  // const history = useHistory();
  const [{ wallets }, dispatch] = useContext(AppContext);
  const { errors } = wallets[0];
  const [mnemonic, setMnemonic] = useState<string>();
  const [password, setPassword] = useState<string>();
  const [confirmPassword, setConfirmPassword] = useState<string>();

  const restoreWallet = () => {
    // Check all fields are not null

    // Check password == confirmPassword

    // Dispatch restore
    dispatch([ACTIONS.WALLET_RESTORE_REQUEST, { mnemonic }]);

    //history.push(INITIALIZE_END_OF_FLOW_ROUTE);
  };

  const handleChangeMnemonic = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('e.target.value', e.target.value);
    setMnemonic(e.target.value);
  };

  useEffect(() => {
    console.log(errors, '- Has changed');
  }, [errors]);

  return (
    <Shell className="space-y-10">
      <h2 className="mb-10 text-3xl font-medium">{'Restore a wallet from a mnemonic phrase'}</h2>
      <p>{'Enter your secret twelve words of your mnemonic phrase to Restore your wallet'}</p>
      <div className="mt-10">
        <div className={classnames({ 'mb-10': !errors?.mnemonic })}>
          <textarea
            id="mnemonic"
            name="mnemonic"
            onChange={handleChangeMnemonic}
            rows={5}
            className={classnames(
              'border-2 focus:ring-primary focus:border-primary sm:text-sm placeholder-grayLight block w-3/5 rounded-md shadow-sm',
              { 'border-red': errors?.mnemonic, 'border-grayLight': !errors?.mnemonic }
            )}
            placeholder="Enter your mnemonic phrase"
            value={mnemonic}
          />
          {errors?.mnemonic && (
            <p className="text-red flex flex-col justify-center h-10">{errors.mnemonic.message}</p>
          )}
        </div>

        <div className={classnames({ 'mb-10': !errors?.password })}>
          <label className="block">
            <span>{'Password'}</span>
            <input
              className={classnames(
                'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 mt-1 mb-6 rounded-md',
                { 'border-red': errors?.password, 'border-grayLight': !errors?.password }
              )}
              placeholder="Enter your password"
              type="password"
            />
          </label>
          {errors?.password && (
            <p className="text-red flex flex-col justify-center h-10">{errors.password.message}</p>
          )}
        </div>

        <div className={classnames({ 'mb-10': !errors?.confirmPassword })}>
          <label className="block">
            <span>{'Confirm Password'}</span>
            <input
              className={classnames(
                'border-2 focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 mt-1 mb-6 rounded-md',
                {
                  'border-red': errors?.confirmPassword,
                  'border-grayLight': !errors?.confirmPassword,
                }
              )}
              placeholder="Confirm your password"
              type="password"
            />
          </label>
          {errors?.confirmPassword && (
            <p className="text-red flex flex-col justify-center h-10">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button className="w-1/5 text-base" onClick={restoreWallet}>
          {'Restore'}
        </Button>
      </div>
    </Shell>
  );
};

export default WalletRestore;
