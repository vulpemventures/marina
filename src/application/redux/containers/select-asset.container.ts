import { connect } from "react-redux"
import SelectAssetView, { SelectAssetProps } from "../../../presentation/wallet/send/select-asset"
import { balances } from "../selectors/balance.selector"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): SelectAssetProps => ({
  network: state.app.network,
  assets: state.assets,
  wallet: state.wallets[0],
  balances: balances(state),
})

const Home = connect(mapStateToProps)(SelectAssetView)

export default Home