import { connect } from "react-redux"
import EndOfFlow, { EndOfFlowProps } from "../../../presentation/wallet/send/end-of-flow"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): EndOfFlowProps => ({
  wallet: state.wallets[0],
  network: state.app.network.value,
})

const SendEndOfFlow = connect(mapStateToProps)(EndOfFlow)

export default SendEndOfFlow