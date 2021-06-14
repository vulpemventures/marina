import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import Select from '../components/select';
import ShellPopUp from '../components/shell-popup';
import { setDeepRestorerGapLimit, startDeepRestorer } from '../../application/redux/actions/wallet';
import Button from '../components/button';
import { updateUtxos } from '../../application/redux/actions/utxos';

export interface DeepRestorerProps {
  restorationLoading: boolean;
  gapLimit: number;
  error?: string;
}

const SettingsDeepRestorerView: React.FC<DeepRestorerProps> = ({
  restorationLoading,
  error,
  gapLimit,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(false);

  const onClickRestore = async () => {
    await dispatch(startDeepRestorer());
    await dispatch(updateUtxos());
  };

  return (
    <ShellPopUp
      btnDisabled={restorationLoading}
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Networks"
    >
      <p className="font-regular my-8 text-base text-left">Select the network</p>
      <Select
        disabled={restorationLoading || isLoading}
        list={['30', '60', '90']}
        selected={gapLimit.toString(10)}
        onSelect={(selectedGapLimit: string) => {
          if (isLoading) return;
          setIsLoading(true);
          dispatch(setDeepRestorerGapLimit(parseInt(selectedGapLimit) as 30 | 60 | 90)).finally(
            () => setIsLoading(false)
          );
        }}
      />

      <Button
        className={'m-2'}
        disabled={restorationLoading}
        onClick={onClickRestore}
        type="submit"
      >
        Restore
      </Button>

      {restorationLoading && <p className="m-2">{'restoration loading'}...</p>}
      {error && <p className="m-2">{error}</p>}
    </ShellPopUp>
  );
};

export default SettingsDeepRestorerView;
