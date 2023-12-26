import React, { useState } from 'react';
import { useHistory } from 'react-router';
import ShellPopUp from '../components/shell-popup';
import { SEND_CHOOSE_FEE_ROUTE } from '../routes/constants';
import Button from '../components/button';
import cx from 'classnames';

const SettingsMenuSwaps: React.FC = () => {
  const history = useHistory();

  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setError('');
    setTouched(true);

    try {
      const json = JSON.parse(event.target.value);
      console.log('json', json);
    } catch (_) {
      setError('Invalid JSON');
    }
  };

  const handleProceed = () => {
    // await sendFlowRepository.setReceiverAddressAmount(address, expectedAmount);

    // go to choose fee route
    history.push(SEND_CHOOSE_FEE_ROUTE);
  };

  return (
    <ShellPopUp className="h-popupContent" currentPage="Refund swap">
      <div className="w-full h-full p-10 bg-white">
        <form className="mt-2">
          <div>
            <label className="block">
              <p className="mb-2 text-base font-medium text-left">JSON</p>
              <textarea
                rows={4}
                id="json"
                name="json"
                onChange={handleChange}
                className={cx('border-2 focus:border-primary block w-full rounded-md', {
                  'border-red': error && touched,
                  'border-grayLight': !error || touched,
                })}
              />
            </label>
          </div>
          {error && touched && (
            <p className="text-red mt-1 text-xs font-medium text-left">{error}</p>
          )}
          <div className="text-right">
            <Button
              className="w-3/5 mt-6 text-base"
              disabled={Boolean(!touched || error)}
              onClick={handleProceed}
            >
              Proceed
            </Button>
          </div>
        </form>
      </div>
    </ShellPopUp>
  );
};

export default SettingsMenuSwaps;
