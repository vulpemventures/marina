import { connect } from "react-redux"
import { RootReducerState } from "../../../domain/common"
import ChooseFeeView, { ChooseFeeProps } from "../../../presentation/wallet/send/choose-fee"
import { balances } from "../selectors/balance.selector"

const mapStateToProps = (state: RootReducerState): ChooseFeeProps => ({
  wallet: state.wallet,
  network: state.app.network,
  transaction: state.transaction,
  assets: state.assets[state.app.network],
  balances: balances(state),
})

const ChooseFee = connect(mapStateToProps)(ChooseFeeView)

export default ChooseFee