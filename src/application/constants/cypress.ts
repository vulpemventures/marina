import type { MnemonicAccountData } from '../../domain/account';
import { AccountType , initialRestorerOpts } from '../../domain/account';
import type { PasswordHash } from '../../domain/password-hash';

export const testPasswordHash: PasswordHash =
  '8314b7cd43641c00d3389128fe0d8ff2c286d5bb42313fe88da1d6c88a60f48e';

/**
 * test wallet data using to skip the onboarding step for Cypress.
 * data:
 * 	| mnemonic = "gas muscle wonder talk sand length swap immense critic opera tree fatigue"
 * 	| pwd = marinatest
 */
export const testWalletData: MnemonicAccountData = {
  type: AccountType.SingleSigAccount,
  restorerOpts: {
    liquid: initialRestorerOpts,
    testnet: initialRestorerOpts,
    regtest: initialRestorerOpts,
  },
  encryptedMnemonic:
    'f343ad95c7be4b07b213ea489d6135b3fb7d659dfb4c9dc2ee9c9e7202100043b5fba308dd2f5d23cd3061452b644653b7c33d79704261feaefd220e9ef9a39784d593bb887f484dccd85b1eb7d53aba',
  masterXPub:
    'vpub5SLqN2bLY4WeYFQ5AFRZPCrhemcgnMPFCcM3L4aepayNa38B7xfjtfan5mNJevzBuUWA98y1CWab2L8dpefgywg3D7dvuNtY1X9UjUKgHvC',
  masterBlindingKey: 'd4422429e8f06ba093524b31b0ef6d69e2d26e0dd87fade4ab5c875fba2e85d1',
};

export const testAppURL = 'https://vulpemventures.github.io/marina-api-test-app/';
