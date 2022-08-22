import { assert } from 'chai';
import { AccountType, initialRestorerOpts, MainAccountID } from '../src/domain/account';
import type {
  WalletPersistedStateV1,
  WalletPersistedStateV2,
  WalletPersistedStateV3,
} from '../src/domain/migrations';
import { walletMigrations } from '../src/domain/migrations';

describe('WalletState migrations', () => {
  it('should be able to migrate from v3 to v4', () => {
    const walletStateV3: WalletPersistedStateV3 = {
      deepRestorer: { gapLimit: 20, restorerLoaders: 0 },
      isVerified: true,
      passwordHash: 'password hash',
      unspentsAndTransactions: {},
      encryptedMnemonic: '08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a',
      accounts: {
        mainAccount: {
          masterBlindingKey: 'master blinding key',
          masterXPub: 'master extended pub',
          type: AccountType.MainAccount,
          restorerOpts: {
            liquid: initialRestorerOpts,
            testnet: initialRestorerOpts,
            regtest: initialRestorerOpts,
          },
        },
        customAccount: {
          type: AccountType.CustomScriptAccount,
          covenantDescriptors: {
            namespace: 'custom-account',
            template: 'raw(00010203)',
          },
        },
      },
      updaterLoaders: 0,
      lockedUtxos: {},
    };
    const walletStateV4 = walletMigrations[4](walletStateV3);
    expect(walletStateV4.accounts['customAccount'].contractTemplate.template).toEqual(
      walletStateV3.accounts['customAccount'].covenantDescriptors.template
    );
    expect(walletStateV4.accounts['customAccount'].contractTemplate.namespace).toEqual(
      walletStateV3.accounts['customAccount'].covenantDescriptors.namespace
    );
  });

  it('should be able to migrate from v2 to v3', () => {
    const walletStateV2: WalletPersistedStateV2 = {
      deepRestorer: { gapLimit: 20, restorerLoaders: 0 },
      isVerified: true,
      passwordHash: 'password hash',
      unspentsAndTransactions: {},
      mainAccount: {
        masterBlindingKey: 'master blinding key',
        masterXPub: 'master extended pub',
        encryptedMnemonic: '08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a',
        type: AccountType.MainAccount,
        restorerOpts: {
          liquid: initialRestorerOpts,
          testnet: initialRestorerOpts,
          regtest: initialRestorerOpts,
        },
      },
      updaterLoaders: 0,
      lockedUtxos: {},
    };

    const walletStateV3 = walletMigrations[3](walletStateV2);
    expect(walletStateV3.encryptedMnemonic).toEqual(walletStateV2.mainAccount.encryptedMnemonic);
    expect(walletStateV3.accounts[MainAccountID].type).toEqual(AccountType.MainAccount);
    expect(walletStateV3.accounts[MainAccountID].masterBlindingKey).toEqual(
      walletStateV2.mainAccount.masterBlindingKey
    );
    expect(walletStateV3.accounts[MainAccountID].masterXPub).toEqual(
      walletStateV2.mainAccount.masterXPub
    );
    expect(walletStateV3.accounts[MainAccountID].restorerOpts).toEqual(
      walletStateV2.mainAccount.restorerOpts
    );
    expect(walletStateV3.passwordHash).toEqual(walletStateV2.passwordHash);
  });

  it('should be able to migrate from v1 to v2', () => {
    const walletStateV1: WalletPersistedStateV1 = {
      deepRestorer: { gapLimit: 20, restorerLoaders: 0 },
      encryptedMnemonic: '08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a',
      isVerified: true,
      masterBlindingKey: 'master blinding key',
      masterXPub: 'master extended pub',
      passwordHash: 'password hash',
      restorerOpts: {
        lastUsedExternalIndex: 0,
        lastUsedInternalIndex: 0,
      },
    };

    const walletStateV2 = walletMigrations[2](walletStateV1);
    expect(walletStateV2.mainAccount.encryptedMnemonic).toEqual(walletStateV1.encryptedMnemonic);
    expect(walletStateV2.mainAccount.masterBlindingKey).toEqual(walletStateV1.masterBlindingKey);
    expect(walletStateV2.mainAccount.masterXPub).toEqual(walletStateV1.masterXPub);
    expect(walletStateV2.deepRestorer).toEqual(walletStateV1.deepRestorer);
    expect(walletStateV2.passwordHash).toEqual(walletStateV1.passwordHash);

    expect(walletStateV2.mainAccount.restorerOpts.liquid.lastUsedExternalIndex).toEqual(-1);
    expect(walletStateV2.mainAccount.restorerOpts.liquid.lastUsedInternalIndex).toEqual(-1);
    expect(walletStateV2.mainAccount.restorerOpts.testnet.lastUsedExternalIndex).toEqual(-1);
    expect(walletStateV2.mainAccount.restorerOpts.testnet.lastUsedInternalIndex).toEqual(-1);
    expect(walletStateV2.mainAccount.restorerOpts.regtest.lastUsedExternalIndex).toEqual(-1);
    expect(walletStateV2.mainAccount.restorerOpts.regtest.lastUsedInternalIndex).toEqual(-1);
    // check that the unspents and transactions are reinitialized (the next update will fetch them)
    // we need this because the type of unspents and txs persisted has changed in V2
    assert.isEmpty(walletStateV2.unspentsAndTransactions.mainAccount.liquid.utxosMap);
    assert.isEmpty(walletStateV2.unspentsAndTransactions.mainAccount.liquid.transactions);
    assert.isEmpty(walletStateV2.unspentsAndTransactions.mainAccount.testnet.utxosMap);
    assert.isEmpty(walletStateV2.unspentsAndTransactions.mainAccount.testnet.transactions);
    assert.isEmpty(walletStateV2.unspentsAndTransactions.mainAccount.regtest.utxosMap);
    assert.isEmpty(walletStateV2.unspentsAndTransactions.mainAccount.regtest.transactions);
  });
});
