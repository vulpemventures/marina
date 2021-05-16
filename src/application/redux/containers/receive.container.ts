import { connect } from "react-redux"
import ReceiveView, { ReceiveProps } from "../../../presentation/wallet/receive"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): ReceiveProps => ({
  network: state.app.network,
  wallet: state.wallets[0]
})

const Receive = connect(mapStateToProps)(ReceiveView)

export default Receive