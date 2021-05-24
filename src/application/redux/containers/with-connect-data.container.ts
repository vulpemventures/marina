import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import { ConnectData } from '../../../domain/connect';
import { Network } from '../../../domain/network';

export interface WithConnectDataProps {
  connectData: ConnectData;
  network: Network;
}

const mapStateToProps = (state: RootReducerState): WithConnectDataProps => ({
  connectData: state.connect,
  network: state.app.network,
});

export function connectWithConnectData(component: React.FC<WithConnectDataProps>) {
  return connect(mapStateToProps)(component);
}
