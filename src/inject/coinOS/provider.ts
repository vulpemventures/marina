import { UtxoInterface } from 'ldk';
import { AssetAmount } from '../../domain/connect';
import WindowProxy from '../proxy';

export default class CoinosProvider extends WindowProxy {
  static PROVIDER_NAME = 'coinos';

  constructor() {
    super(CoinosProvider.PROVIDER_NAME);
  }

  // returns the list of unspents owned by the restricted asset account
  async getCoins(): Promise<UtxoInterface[]> {
    return this.proxy(this.getCoins.name, []);
  }

  // returns a signed pset with input = (txid, vout) (signed with SIGHASH_NONE)
  async allowCoin(toAllow: AssetAmount[]): Promise<string> {
    return this.proxy(this.allowCoin.name, [toAllow]);
  }
}
