import { setApproveParams } from '../../application/redux/actions/allowance';
import { selectUtxos } from '../../application/redux/selectors/wallet.selector';
import { RestrictedAssetAccountID } from '../../domain/account';
import { AssetAmount } from '../../domain/connect';
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
          if (!params || params.length !== 1) throw new Error('invalid params');
          const requestParams: AssetAmount[] = params[0].filter(isAssetAmount);
          if (requestParams.length <= 0) throw new Error('invalid params');

          await this.store.dispatchAsync(setApproveParams(requestParams));
          const result = await this.openAndWaitPopup<string>('allow-coin');
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

function isAssetAmount(assetAmount: any): assetAmount is AssetAmount {
  return assetAmount.asset && assetAmount.amount;
}
