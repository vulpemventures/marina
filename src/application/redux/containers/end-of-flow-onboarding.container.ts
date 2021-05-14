import { connect } from "react-redux"
import EndOfFlowOnboardingView, { EndOfFlowProps } from "../../../presentation/onboarding/end-of-flow"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): EndOfFlowProps => ({
  wallets: state.wallets,
  onboarding: state.onboarding,
})

const EndOfFlow = connect(mapStateToProps)(EndOfFlowOnboardingView)

export default EndOfFlow