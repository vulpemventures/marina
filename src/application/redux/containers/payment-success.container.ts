import { connect } from "react-redux"
import PaymentSuccessView, { PaymentSuccessProps } from "../../../presentation/wallet/send/payment-success"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): PaymentSuccessProps => ({
  wallet: state.wallets[0],
  network: state.app.network,
})

const PaymentSuccess = connect(mapStateToProps)(PaymentSuccessView)

export default PaymentSuccess