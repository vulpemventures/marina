import { connect } from "react-redux"
import { RootReducerState } from "../../../domain/common"
import ChooseFeeView, { ChooseFeeProps } from "../../../presentation/wallet/send/choose-fee"
import { lbtcAssetByNetwork } from "../../utils"
import { balances } from "../selectors/balance.selector"

const mapStateToProps = (state: RootReducerState): ChooseFeeProps => ({
  wallet: state.wallet,
  network: state.app.network,
  transaction: state.transaction,
  assets: state.assets[state.app.network],
  balances: balances(state),
  taxiAssets: state.taxi.taxiAssets,
  lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
})

const ChooseFee = connect(mapStateToProps)(ChooseFeeView)

export default ChooseFee