import { connect } from "react-redux"
import EndOfFlowOnboardingView, { EndOfFlowProps } from "../../../presentation/onboarding/end-of-flow"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): EndOfFlowProps => {
  return {
    wallets: state.wallets,
    onboarding: state.onboarding,
    network: state.app.network
  }
}

const EndOfFlow = connect(mapStateToProps)(EndOfFlowOnboardingView)

export default EndOfFlow