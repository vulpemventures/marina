import { connect } from "react-redux"
import { RootReducerState } from "../../../domain/common"
import ReceiveView, { ReceiveProps } from "../../../presentation/wallet/receive"

const mapStateToProps = (state: RootReducerState): ReceiveProps => ({
  network: state.app.network,
  wallet: state.wallet
})

const Receive = connect(mapStateToProps)(ReceiveView)

export default Receive