import React from 'react';
import { useHistory } from 'react-router';
import Button from '../../components/button';
import Shell from '../../components/shell';
import { INITIALIZE_SEED_PHRASE_ROUTE } from '../../routes/constants';

const WalletCreate: React.FC = () => {
  const history = useHistory();
  const handleClick = () => history.push(INITIALIZE_SEED_PHRASE_ROUTE);

  return (
    <Shell className="space-y-10">
      <h1 className="mb-5 text-3xl font-medium">Create password</h1>
      <label className="block">
        <span className="font-medium">{'New password'}</span>
        <input
          type="password"
          className="focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 mt-1 mb-6 rounded-md"
          placeholder="Enter your password"
        />
      </label>
      <label className="block">
        <span className="font-medium">{'Confirm Password'}</span>
        <input
          type="password"
          className="focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 mt-1 mb-6 rounded-md"
          placeholder="Confirm your password"
        />
      </label>
      <label htmlFor="terms" className="text-grayLight block text-base">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          className="focus:ring-primary text-primary border-grayLight w-4 h-4 mr-2 text-base rounded"
        />
        {'I’ve read and accept the '}
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a className="text-primary" href="#">
          {'terms and conditions'}
        </a>
      </label>
      <Button className="w-1/5 text-base" onClick={handleClick}>
        {'Create'}
      </Button>
    </Shell>
  );
};

export default WalletCreate;
