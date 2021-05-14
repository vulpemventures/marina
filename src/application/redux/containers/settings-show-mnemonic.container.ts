import { connect } from "react-redux"
import SettingsShowMnemonicView, { SettingsShowMnemonicProps } from "../../../presentation/settings/show-mnemonic"
import { RootState } from "../store"

const mapStateToProps = (state: RootState): SettingsShowMnemonicProps => ({
  wallet: state.wallets[0],
})

const SettingsShowMnemonic = connect(mapStateToProps)(SettingsShowMnemonicView)

export default SettingsShowMnemonic;