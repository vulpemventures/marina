import { connect } from "react-redux"
import { RootReducerState } from "../../../domain/common"
import EndOfFlowOnboardingView, { EndOfFlowProps } from "../../../presentation/onboarding/end-of-flow"

const mapStateToProps = (state: RootReducerState): EndOfFlowProps => {
  return {
    wallet: state.wallet,
    onboarding: state.onboarding,
    network: state.app.network
  }
}

const EndOfFlow = connect(mapStateToProps)(EndOfFlowOnboardingView)

export default EndOfFlow