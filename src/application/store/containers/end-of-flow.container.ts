import { connect } from "react-redux"
import EndOfFlowView, { EndOfFlowProps } from "../../../presentation/onboarding/end-of-flow"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): EndOfFlowProps => ({
  wallets: state.wallets,
  onboarding: state.onboarding,
})

const EndOfFlow = connect(mapStateToProps)(EndOfFlowView)

export default EndOfFlow