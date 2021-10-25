import { UtxoInterface } from "ldk";
import WindowProxy from "../proxy";

export default class CoinosProvider extends WindowProxy {
  static PROVIDER_NAME = 'coinos';

  constructor() {
    super(CoinosProvider.PROVIDER_NAME);
  }

  async getCoins(): Promise<UtxoInterface[]> {
    return this.proxy(this.getCoins.name, []);
  }
}