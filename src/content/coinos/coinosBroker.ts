import { setAllowCoinInConnectData } from '../../application/redux/actions/allowance';
import { selectUtxos } from '../../application/redux/selectors/wallet.selector';
import { RestrictedAssetAccountID } from '../../domain/account';
import {
  MessageHandler,
  newErrorResponseMessage,
  newSuccessResponseMessage,
  RequestMessage,
} from '../../domain/message';
import CoinosProvider from '../../inject/coinOS/provider';
import Broker, { BrokerOption } from '../broker';
import MarinaBroker from '../marina/marinaBroker';

export default class CoinosBroker extends Broker {
  static async Start() {
    const broker = new CoinosBroker([await MarinaBroker.WithProxyStore()]);
    broker.start();
  }

  private constructor(opts: BrokerOption[]) {
    super(CoinosProvider.PROVIDER_NAME, opts);
  }

  start() {
    super.start(this.messageHandler);
  }

  private messageHandler: MessageHandler = async ({ id, name, params }: RequestMessage) => {
    if (!this.store) throw new Error('proxy store is not set up in allowance broker');
    const successMsg = (data?: any) => newSuccessResponseMessage(id, data);

    try {
      switch (name) {
        case CoinosProvider.prototype.getCoins.name: {
          const utxos = selectUtxos(RestrictedAssetAccountID)(this.store.getState());
          return successMsg(utxos);
        }

        case CoinosProvider.prototype.allowCoin.name: {
          if (!params || params.length < 2) throw new Error('invalid params');
          const txid = params[0];
          const vout = params[1];

          await this.store.dispatchAsync(setAllowCoinInConnectData(txid, vout));

          const utxos = selectUtxos(RestrictedAssetAccountID)(this.store.getState());
          const selectedCoin = utxos.find((u) => u.txid === txid && u.vout === vout);
          if (!selectedCoin) {
            throw new Error(`utxo ${txid}:${vout} is not found.`);
          }

          const result = await this.openAndWaitPopup<boolean>('allow-coin');
          if (!result) {
            throw new Error('user rejected the allowance');
          }

          return successMsg(result);
        }

        default:
          return newErrorResponseMessage(id, new Error('Method not implemented.'));
      }
    } catch (err) {
      if (err instanceof Error) return newErrorResponseMessage(id, err);
      else throw err;
    }
  };
}
