import { Balance, Recipient } from 'marina-provider';
import { setApproveParams } from '../../application/redux/actions/allowance';
import { flushTx, setTx, setTxData } from '../../application/redux/actions/connect';
import {
  incrementAddressIndex,
  incrementChangeAddressIndex,
} from '../../application/redux/actions/wallet';
import { selectBalances } from '../../application/redux/selectors/balance.selector';
import {
  selectRestrictedAssetAccount,
  selectTransactions,
  selectUtxos,
} from '../../application/redux/selectors/wallet.selector';
import { lbtcAssetByNetwork, sortRecipients } from '../../application/utils';
import { RestrictedAssetAccountID } from '../../domain/account';
import { assetGetterFromIAssets } from '../../domain/assets';
import { AssetAmount } from '../../domain/connect';
import {
  MessageHandler,
  newErrorResponseMessage,
  newSuccessResponseMessage,
  RequestMessage,
} from '../../domain/message';
import CoinosProvider from '../../inject/coinOS/provider';
import { SignTransactionPopupResponse } from '../../presentation/connect/sign-pset';
import { SpendPopupResponse } from '../../presentation/connect/spend';
import Broker, { BrokerOption } from '../broker';
import MarinaBroker from '../marina/marinaBroker';

export default class CoinosBroker extends Broker {
  private hostname: string;

  static async Start(hostname: string) {
    const broker = new CoinosBroker(hostname, [await MarinaBroker.WithProxyStore()]);
    broker.start();
  }

  private constructor(hostname: string, opts: BrokerOption[] = []) {
    super(CoinosProvider.PROVIDER_NAME, opts);
    this.hostname = hostname;
  }

  start() {
    super.start(this.messageHandler);
  }

  private messageHandler: MessageHandler = async ({ id, name, params }: RequestMessage) => {
    if (!this.store) throw new Error('proxy store is not set up in allowance broker');
    const state = this.store.getState();
    const successMsg = (data?: any) => newSuccessResponseMessage(id, data);

    try {
      switch (name) {
        case CoinosProvider.prototype.getCoins.name: {
          const utxos = selectUtxos(RestrictedAssetAccountID)(state);
          return successMsg(utxos);
        }

        case CoinosProvider.prototype.getTransactions.name: {
          const transactions = selectTransactions(RestrictedAssetAccountID)(state);
          return successMsg(transactions);
        }

        case CoinosProvider.prototype.getBalances.name: {
          const balances = selectBalances(RestrictedAssetAccountID)(state);
          const assetGetter = assetGetterFromIAssets(state.assets);
          const balancesResult: Balance[] = [];
          for (const [assetHash, amount] of Object.entries(balances)) {
            balancesResult.push({ asset: assetGetter(assetHash), amount });
          }
          return successMsg(balancesResult);
        }

        case CoinosProvider.prototype.getNetwork.name: {
          return successMsg(state.app.network);
        }

        case CoinosProvider.prototype.getNextAddress.name: {
          const account = selectRestrictedAssetAccount(state);
          if (!account) throw RestrictedAccountNotDefined;
          const id = await account.getWatchIdentity();
          const nextAddress = await id.getNextAddress();
          await this.store.dispatchAsync(incrementAddressIndex(account.getAccountID()));
          return successMsg(nextAddress);
        }

        case CoinosProvider.prototype.getNextChangeAddress.name: {
          const account = selectRestrictedAssetAccount(state);
          if (!account) throw RestrictedAccountNotDefined;
          const id = await account.getWatchIdentity();
          const nextAddress = await id.getNextChangeAddress();
          await this.store.dispatchAsync(incrementChangeAddressIndex(account.getAccountID()));
          return successMsg(nextAddress);
        }

        case CoinosProvider.prototype.signTransaction.name: {
          if (!params || params.length !== 1) {
            throw new Error('Missing params');
          }
          const [pset] = params;
          await this.store.dispatchAsync(setTx(this.hostname, pset));
          const { accepted, signedPset } =
            await this.openAndWaitPopup<SignTransactionPopupResponse>('sign-pset');

          await this.store.dispatchAsync(flushTx());
          if (!accepted) throw new Error('User rejected the sign request');
          if (!signedPset) throw new Error('Something went wrong with tx signing');

          return successMsg(signedPset);
        }

        case CoinosProvider.prototype.sendTransaction.name: {
          const [recipients, feeAssetHash] = params as [Recipient[], string | undefined];
          const lbtc = lbtcAssetByNetwork(state.app.network);
          const feeAsset = feeAssetHash ? feeAssetHash : lbtc;

          if (![lbtc, ...state.taxi.taxiAssets].includes(feeAsset)) {
            throw new Error(`${feeAsset} not supported as fee asset.`);
          }

          const { addressRecipients, data } = sortRecipients(recipients);

          await this.store.dispatchAsync(
            setTxData(this.hostname, addressRecipients, feeAsset, state.app.network, data)
          );
          const { accepted, signedTxHex } = await this.openAndWaitPopup<SpendPopupResponse>(
            'spend'
          );

          if (!accepted) throw new Error('the user rejected the create tx request');
          if (!signedTxHex) throw new Error('something went wrong with the tx crafting');
          return successMsg(signedTxHex);
        }

        case CoinosProvider.prototype.approveSpend.name: {
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

const RestrictedAccountNotDefined = new Error('restricted account is not defined');
