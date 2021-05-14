import { connect } from "react-redux"
import ChooseFeeView, { ChooseFeeProps } from "../../../presentation/wallet/send/choose-fee"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): ChooseFeeProps => ({
  wallet: state.wallets[0],
  network: state.app.network.value,
  transaction: state.transaction,
  assets: state.assets,
})

const ChooseFee = connect(mapStateToProps)(ChooseFeeView)

export default ChooseFee