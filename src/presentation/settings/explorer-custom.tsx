import type { NetworkString } from 'ldk';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import SettingsCustomExplorerForm from '../components/explorer-custom-form';
import ShellPopUp from '../components/shell-popup';

export interface SettingsExplorerCustomProps {
  network: NetworkString;
}

const SettingsExplorerCustomView: React.FC<SettingsExplorerCustomProps> = ({ network }) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const history = useHistory();

  const onDone = () => {
    history.goBack();
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Explorer"
    >
      <SettingsCustomExplorerForm onDone={onDone} dispatch={dispatch} network={network} />
    </ShellPopUp>
  );
};

export default SettingsExplorerCustomView;
