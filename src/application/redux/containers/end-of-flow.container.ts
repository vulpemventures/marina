import { connect } from "react-redux"
import { RootReducerState } from "../../../domain/common"
import EndOfFlow, { EndOfFlowProps } from "../../../presentation/wallet/send/end-of-flow"

const mapStateToProps = (state: RootReducerState): EndOfFlowProps => ({
  wallet: state.wallet,
  network: state.app.network,
})

const SendEndOfFlow = connect(mapStateToProps)(EndOfFlow)

export default SendEndOfFlow