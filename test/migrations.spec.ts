import { assert } from 'chai';
import type { WalletPersistedStateV1 } from '../src/domain/migrations';
import { walletMigrations } from '../src/domain/migrations';

describe('migration from v1 to v2', () => {
  it('should be able to compute v2 from v1', () => {
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
