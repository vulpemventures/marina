import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { SeedConfirmProps } from '../../../presentation/onboarding/seed-confirm';
import SeedConfirmView from '../../../presentation/onboarding/seed-confirm';

const mapStateToProps = (state: RootReducerState): SeedConfirmProps => ({
  onboardingMnemonic: state.onboarding.mnemonic,
  isFromPopupFlow: state.onboarding.isFromPopupFlow,
});

const SeedConfirm = connect(mapStateToProps)(SeedConfirmView);

export default SeedConfirm;
