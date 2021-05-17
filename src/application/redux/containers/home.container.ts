import { connect } from "react-redux"
import HomeView, { HomeProps } from "../../../presentation/wallet/home"
import { balances } from "../selectors/balance.selector"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): HomeProps => ({
  network: state.app.network,
  assets: state.assets,
  transaction: state.transaction,
  wallet: state.wallets[0],
  assetsBalance: balances(state),
})

const Home = connect(mapStateToProps)(HomeView)

export default Home