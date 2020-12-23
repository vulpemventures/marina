import React from 'react';
import { useHistory } from 'react-router';
import Button from '../../components/button';
import Shell from '../../components/shell';
import { INITIALIZE_END_OF_FLOW_ROUTE } from '../routes/constants';

const WalletRestore: React.FC = () => {
  const history = useHistory();
  const handleClick = () => history.push(INITIALIZE_END_OF_FLOW_ROUTE);

  return (
    <Shell>
      <h2 className="mb-10 text-3xl font-medium">{'Restore a wallet from a mnemonic phrase'}</h2>
      <p>{'Enter your secret twelve words of your mnemonic phrase to Restore your wallet'}</p>
      <div>
        <div className="mt-10">
          <textarea
            id="mnemonic"
            name="mnemonic"
            rows={5}
            className="focus:ring-primary focus:border-primary sm:text-sm placeholder-grayLight border-grayLight block w-3/5 rounded-md shadow-sm"
            placeholder="Enter your mnemonic phrase"
          />
          <div className="my-5">
            <input
              id="show-mnemonic"
              name="show-mnemonic"
              type="checkbox"
              className="focus:ring-primary text-primary placeholder-grayLight border-grayLight w-4 h-4 mr-2 rounded"
            />
            <label htmlFor="show-mnemonic" className="text-grayLight text-base">
              {'Show mnemonic phrase'}
            </label>
          </div>
          <label className="block">
            <span>{'Password'}</span>
            <input
              type="password"
              className="focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 mt-1 mb-6 rounded-md"
              placeholder="Enter your password"
            />
          </label>
          <label className="block">
            <span>{'Confirm Password'}</span>
            <input
              type="password"
              className="focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 mt-1 mb-6 rounded-md"
              placeholder="Confirm your password"
            />
          </label>
          <Button className="w-1/5 text-base" onClick={handleClick}>
            {'Restore'}
          </Button>
        </div>
      </div>
    </Shell>
  );
};

export default WalletRestore;
