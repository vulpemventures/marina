import { connect } from "react-redux"
import HomeView, { HomeProps } from "../../../presentation/wallet/home"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): HomeProps => ({
  network: state.app.network,
  assets: state.assets,
  transaction: state.transaction,
  wallet: state.wallets[0]
})

const Home = connect(mapStateToProps)(HomeView)

export default Home