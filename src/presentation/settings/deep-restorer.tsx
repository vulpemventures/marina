import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { setDeepRestorerGapLimit } from '../../application/redux/actions/wallet';
import Button from '../components/button';
import type { AccountID } from '../../domain/account';
import { restoreTaskAction } from '../../application/redux/actions/task';
import ButtonsAtBottom from '../components/buttons-at-bottom';

export interface DeepRestorerProps {
  restorationLoading: boolean;
  allAccountsIDs: AccountID[];
  gapLimit: number;
  error?: string;
}

const SettingsDeepRestorerView: React.FC<DeepRestorerProps> = ({
  restorationLoading,
  allAccountsIDs,
  error,
  gapLimit,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(false);

  const onClickRestore = async () => {
    await Promise.all(allAccountsIDs.map(restoreTaskAction).map(dispatch));
  };

  return (
    <ShellPopUp
      btnDisabled={restorationLoading}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Deep restorer"
    >
      <p className="font-regular my-8 text-base text-left">Select the restoration gap limit</p>
      <Select
        disabled={restorationLoading || isLoading}
        list={['20', '40', '80', '160']}
        selected={gapLimit.toString(10)}
        onSelect={(selectedGapLimit: string) => {
          if (isLoading) return;
          setIsLoading(true);
          dispatch(setDeepRestorerGapLimit(parseInt(selectedGapLimit))).finally(() =>
            setIsLoading(false)
          );
        }}
      />
      {restorationLoading && <p className="m-2">{'restoration loading'}...</p>}
      {error && <p className="m-2">{error}</p>}
      <ButtonsAtBottom>
        <Button disabled={restorationLoading || isLoading} onClick={onClickRestore} type="submit">
          Restore
        </Button>
      </ButtonsAtBottom>
    </ShellPopUp>
  );
};

export default SettingsDeepRestorerView;
