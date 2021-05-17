import { connect } from 'react-redux';
import { ConnectData } from "../../../domain/connect";
import { RootState } from "../store";

export interface WithConnectDataProps {
  connectData: ConnectData;
}

const mapStateToProps = (state: RootState): WithConnectDataProps => ({
  connectData: state.connect[state.app.network],
})

export function connectWithConnectData(component: React.FC<WithConnectDataProps>) {
  return connect(mapStateToProps)(component);
}