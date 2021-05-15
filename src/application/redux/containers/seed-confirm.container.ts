import { connect } from "react-redux"
import SeedConfirmView, { SeedConfirmProps } from "../../../presentation/onboarding/seed-confirm"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): SeedConfirmProps => ({
  onboardingMnemonic: state.onboarding.mnemonic,
})

const SeedConfirm = connect(mapStateToProps)(SeedConfirmView)

export default SeedConfirm