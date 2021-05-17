import { connect } from "react-redux"
import ConfirmationView, { ConfirmationProps } from "../../../presentation/wallet/send/confirmation"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): ConfirmationProps => ({
  wallet: state.wallets[0],
  network: state.app.network,
  assets: state.assets,
})

const Confirmation = connect(mapStateToProps)(ConfirmationView)

export default Confirmation